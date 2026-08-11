# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1]

- Increased chunk size from 1024 to 16384 (2^14) in the _send() method of mtm.ts
  to increase the speed of sending.

## [0.1.0]

- Added additional parameter to customRunObject() and runCustom() to pass the filename.

## [0.0.1]

### Changed

- Project split from original source [ing-bank/vscode-psl](https://github.com/ing-bank/vscode-psl.git)
  to new dedicated source [profile-connector](https://github.com/ing-bank/profile-connector.git).
  The original changelog is removed in its entirety, as the profile-connector is
  a new package that will be released.
- Changed from tslint to eslint
- Changed from jest to node unit tests

[Unreleased]: https://github.com/ing-bank/psl-parser/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/ing-bank/psl-parser/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ing-bank/psl-parser/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/ing-bank/psl-parser/compare/4814107ce1840d92c2ab0de99e31887014453d4c...v0.0.1
