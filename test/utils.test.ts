import assert from "node:assert/strict";
import { describe, test } from "node:test";

import * as utils from "../src/utils";

describe("When calling utils.getDbtblInfo()", () => {
	[
		["Batch", "DBTBL33"],
		// TODO: (Mischa Reitsma) Fix code, lol.
		// ["Column", "DBTBL1D"],
		// ["Procedure", "DBTBL25"],
		["Table", "DBTBL1"],
		["RandomStuff", "Unknown Type"]
	].forEach(input => {
		test(`Expect ${input[1]} when passing ${input[0]}`, () => {
			assert.strictEqual(utils.getDbtblInfo(input[0]), input[1]);
		});
	});
});
