import HostSocket from "./hostSocket";
import * as utils from "./utils";
import * as fs from "fs";

enum ServiceClass {
	CONNECTION = 0,
	MRPC = 3,
	SQL = 5,
}

interface ServiceDetail {
	serviceClass: ServiceClass;
	mrpcID?: string;
}

export class MtmConnection {

	private socket: HostSocket = new HostSocket();
	private messageByte: string = String.fromCharCode(28);
	private token: string = "";
	private messageId: number = 0;
	private maxRow: number = 30;
	private isSql: boolean = false;
	private recordCount: number = 0;

	constructor(
		private serverType: string = "SCA$IBS",
		private encoding: BufferEncoding = "utf8")
	{}

	async open(host: string, port: number, profileUsername: string, profilePassword: string) {
		await this.socket.connect(port, host);
		const prepareString = utils.connectionObject(profileUsername, profilePassword);
		const returnArray = await this.execute(
			{ serviceClass: ServiceClass.CONNECTION },
			prepareString
		);
		this.token = returnArray;
	}

	async send(fileName: string) {
		try {
			const codeToken = await this._send(fileName);
			const returnString = await this.saveInProfile(fileName, codeToken);
			if (returnString !== "1") {
				throw new Error(returnString.split("\r\n")[1]);
			}
			return returnString;
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async testCompile(fileName: string) {
		try {
			const codeToken = await this._send(fileName);
			return await this._testCompile(fileName, codeToken);
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async get(fileName: string) {
		try {
			return await this._get(fileName);
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async compileAndLink(fileName: string) {
		try {
			return await this._compileAndLink(fileName);
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async runPsl(fileName: string) {
		try {
			const codeToken = await this._send(fileName);
			return await this._runPsl(codeToken);
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async runCustom(fileName: string, mrpcID: string, request: string) {
		try {
			const codeToken = await this._send(fileName);
			return await this._runCustom(codeToken, mrpcID, request);
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async close() {
		this.socket.closeConnection();
		return this.socket.socket.destroyed;
	}

	async batchcomp(fileName: string) {
		try {
			return await this.batchCompileAndLink(fileName);
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async getTable(fileName: string) {
		try {
			this.isSql = false;
			return await this._getTable(fileName);
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async sqlQuery(query: string) {
		try {
			this.isSql = true;
			return await this._sqlQuery(query);
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async getPSLClasses() {
		try {
			return await this._getPslClasses();
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	private async _send(filename: string) {
		let returnString: string;
		
		const fileString: string = (
			await readFileAsync(filename, {encoding: this.encoding})
		).toString(this.encoding);
		
		const fileContentLength: number = fileString.length;
		const totalLoop: number = Math.ceil(fileContentLength / 1024);
		let codeToken: string = "";
		for (let i = 0; i < totalLoop; i++) {
			// TODO: (Mischa Reitsma) This could be stretched a bit. Message can grow to max 1MB (prefeably a bit less), but 2048 bytes is nothing.
			const partialString: string = fileString.slice(i * 1024, (i + 1) * 1024);
			let withPipe: string = "";
			for (const char of partialString) {
				withPipe += char.charCodeAt(0) + "|";
			}
			const prepareString: string = utils.initCodeObject(withPipe, codeToken);
			returnString = await this.execute(
				{ mrpcID: "121", serviceClass: ServiceClass.MRPC },
				prepareString
			);
			codeToken = returnString;
		}
		const prepareString: string = utils.initCodeObject("", codeToken);
		return await this.execute(
			{ mrpcID: "121", serviceClass: ServiceClass.MRPC },
			prepareString
		);
	}

	private async saveInProfile(fileName: string, codeToken: string) {
		const fileDetails = utils.getObjectType(fileName);
		const prepareString = utils.saveObject(
			fileDetails.fileBaseName,
			codeToken,
			utils.getUserName()
		);
		return await this.execute(
			{ mrpcID: "121", serviceClass: ServiceClass.MRPC },
			prepareString
		);
	}

	private async _testCompile(fileName: string, codeToken: string) {
		const fileDetails = utils.getObjectType(fileName);
		const prepareString = utils.testCompileObject(fileDetails.fileBaseName, codeToken);
		return await this.execute(
			{ mrpcID: "121", serviceClass: ServiceClass.MRPC },
			prepareString
		);
	}

	private async _get(fileName: string) {
		const fileDetails = utils.getObjectType(fileName);
		let prepareString = utils.initObject(fileDetails.fileId, fileDetails.fileName);
		
		let returnString: string = await this.execute(
			{ mrpcID: "121", serviceClass: ServiceClass.MRPC },
			prepareString
		);
		
		const codeToken = returnString.split("\r\n")[1];
		let hasMore = "1";
		returnString = "";
		while (hasMore === "1") {
			prepareString = utils.retObject(codeToken);
			const nextReturnString = await this.execute(
				{ mrpcID: "121", serviceClass: ServiceClass.MRPC },
				prepareString
			);
			hasMore = nextReturnString.substr(0, 1);

			returnString = returnString +
				nextReturnString.substr(1, nextReturnString.length);
		}
		return returnString;
	}

	private async _compileAndLink(fileName: string) {
		const fileDetails = utils.getObjectType(fileName);
		let prepareString = utils.preCompileObject(fileDetails.fileBaseName);
		
		const codeToken = await this.execute(
			{ mrpcID: "121", serviceClass: ServiceClass.MRPC },
			prepareString
		);
		
		prepareString = utils.compileObject(codeToken);
		return await this.execute(
			{ mrpcID: "121", serviceClass: ServiceClass.MRPC },
			prepareString
		);
	}

	private async _runPsl(codeToken: string) {
		const prepareString = utils.pslRunObject(codeToken);
		return await this.execute(
			{ mrpcID: "121", serviceClass: ServiceClass.MRPC },
			prepareString
		);
	}

	private async _runCustom(codeToken: string, mrpcID: string, request: string) {
		const prepareString = utils.customRunObject(request, codeToken);
		return await this.execute(
			{ mrpcID, serviceClass: ServiceClass.MRPC },
			prepareString
		);
	}

	// Batch complie is not working since 81 is not fully exposed from profile
	private async batchCompileAndLink(fileName: string) {
		const fileDetails = utils.getObjectType(fileName);
		const dbtblTableName = utils.getDbtblInfo(fileDetails.fileId);
		
		const prepareString = utils.batchCompileObject(
			dbtblTableName,
			fileDetails.fileName
		);
		
		return await this.execute(
			{ mrpcID: "121", serviceClass: ServiceClass.MRPC },
			prepareString
		);
	}

	private async _getTable(fileName: string) {
		let returnString: string;
		const fileDetails = utils.getObjectType(fileName);
		
		const tableReturnString = (
			fileDetails.fileBaseName +
			String.fromCharCode(1) +
			await this._get(fileName)
		);

		let selectStatement =
			`SELECT COUNT(DI) FROM DBTBL1D WHERE FID='${fileDetails.fileName}'`;

		this.recordCount = Number(await this._sqlQuery(selectStatement));
		selectStatement = `SELECT DI FROM DBTBL1D WHERE FID='${fileDetails.fileName}'`;
		returnString = await this._sqlQuery(selectStatement);
		const columnList: string[] = returnString.split("\r\n");
		returnString = tableReturnString;
		for (let i = 0; i < columnList.length; i++) {
			fileName = fileDetails.fileName + "-" + columnList[i] + ".COL";
			returnString = (
				returnString + String.fromCharCode(0) + fileName +
				String.fromCharCode(1) + await this._get(fileName)
			);
		}
		return returnString;
	}

	private async _sqlQuery(selectQuery: string) {
		selectQuery = selectQuery.toUpperCase();
		if (!selectQuery.startsWith("SELECT")) {
			throw new Error("Not a select query");
		}
		const cursorNumber = new Date().getTime().toString();
		let returnString = await this.openSqlCursor(cursorNumber, selectQuery);
		returnString = await this.fetchSqlCursor(cursorNumber);
		await this.closeSqlCursor(cursorNumber);
		return returnString;
	}

	private async openSqlCursor(cursorNumber: string, selectQuery: string) {
		const openCursor = "OPEN CURSOR " + cursorNumber + " AS ";
		const prepareString = utils.sqlObject(openCursor + selectQuery, "");
		return await this.execute({ serviceClass: ServiceClass.SQL }, prepareString);
	}

	private async fetchSqlCursor(cursorNumber: string) {
		const fetchCursor = "FETCH " + cursorNumber;
		const rows = "ROWS=" + this.maxRow;
		const prepareString = utils.sqlObject(fetchCursor, rows);
		
		let returnString = await this.execute(
			{ serviceClass: ServiceClass.SQL },
			prepareString
		);
		
		let splitReturnString: string[] = returnString.split(String.fromCharCode(0));
		let totalCount = Number(splitReturnString[0]);
		returnString = splitReturnString[1];
		if (this.isSql === false) {
			while (totalCount < this.recordCount) {
				splitReturnString = [];
				
				const nextReturnString = await this.execute(
					{ serviceClass: ServiceClass.SQL },
					prepareString
				);
				
				splitReturnString = nextReturnString.split(String.fromCharCode(0));
				totalCount = totalCount + Number(splitReturnString[0]);
				returnString = returnString + "\r\n" + splitReturnString[1];
			}
		}
		return returnString;
	}

	private async closeSqlCursor(cursorNumber: string) {
		const closeCursor = "CLOSE " + cursorNumber;
		const prepareString = utils.sqlObject(closeCursor, "");
		return await this.execute({ serviceClass: ServiceClass.SQL }, prepareString);
	}

	private async _getPslClasses() {
		const prepareString = utils.getPslCls();
		return await this.execute(
			{ mrpcID: "121", serviceClass: ServiceClass.MRPC },
			prepareString
		);
	}

	private async execute(detail: ServiceDetail, prepareString: string): Promise<string> {
		const sendingMessage = this.prepareSendingMessage(detail, prepareString);
		await this.socket.send(sendingMessage);
		let message = await this.socket.onceData();
		const { totalBytes, startByte } = utils.unpack(message);
		let messageLength = message.length;

		while (messageLength < totalBytes) {
			const nextMessage = await this.socket.onceData();
			messageLength = messageLength + nextMessage.length;
			message = Buffer.concat([message, nextMessage], messageLength);
		}
		return utils.parseResponse(
			detail.serviceClass,
			message.slice(startByte, message.length),
			this.encoding
		);
	}

	private prepareSendingMessage(detail: ServiceDetail, prepareString: string): string {
		const tokenMessage = utils.tokenMessage(
			detail.serviceClass,
			this.token,
			this.messageId
		);
		
		if (detail.serviceClass === ServiceClass.MRPC) {
			const version: number = 1;
			prepareString = utils.mrpcMessage(
				detail.mrpcID,
				version.toString(),
				prepareString
			);
		}
		let sendingMessage = utils.sendingMessage(tokenMessage, prepareString);
		sendingMessage = this.serverType + this.messageByte + sendingMessage;
		sendingMessage = utils.pack(sendingMessage.length + 2) + sendingMessage;
		this.messageId++;
		return sendingMessage;
	}
}

function readFileAsync(
	file: string,
	options?: {encoding?: string, flag?: string}
): Promise<Buffer | string> {
	return new Promise((resolve, reject) => {
		fs.readFile(file, {encoding: null, flag: options.flag}, (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}
