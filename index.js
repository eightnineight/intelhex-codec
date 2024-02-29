import { sprintf } from 'sprintf-js';

const isDigit = (ch) => {
    return (0x30 <= ch && ch <= 0x39);
}
const isUppercaseLetter = (ch) => {
    return (0x41 <= ch && ch <= 0x46);
}
const isLowercaseLetter = (ch) => {
    return (0x61 <= ch && ch <= 0x66);
}
const isAlphabet = (ch) => {
    return (isUppercaseLetter(ch) || isLowercaseLetter(ch));
}
const isAlphaDigit = (ch) => {
    return isDigit(ch) || isAlphabet(ch);
}

const byte2hex = (byte) => {
    return [((byte >> 4) & 0x0f).toString(16), (byte & 0x0f).toString(16)];
}
const nibble2byte = (nibble) => {
    if (isDigit(nibble)) {
        return nibble - 0x30;
    } else if (isUppercaseLetter(nibble)) {
        return nibble - 55;
    } else if (isLowercaseLetter(nibble)) {
        return nibble - 87;
    } else {
        throw 'ERR_WRONG_FORMAT';
    }
}
const hex2byte = (hex) => {
    return (nibble2byte(hex[0]) << 4) + nibble2byte(hex[1]);
}

class intelhexCodec {
    static encode = class {
        static asString = (input) => {
            
        };
    };

    static decode = class {
        static #split2Lines = (input) => {
            const lines = [];
            let line = [];

            for (let byte of input) {
                if (byte === 0x0a || byte === 0x0d) {
                    if (line.length) {
                        while (line[0] === 0x20 || line[0] === 0x09) {
                            line.shift();
                        }
                    }
                    if (line.length) {
                        while (line.at(-1) === 0x20 || line.at(-1) === 0x09) {
                            line.pop();
                        }
                    }
                    if (line.length) {
                        lines.push(line);
                    }
                    line = [];
                } else {
                    line.push(byte);
                }
            }
            return lines;
        }
        static #splitLine2fields = (line) => {
            if (line[0] !== ':'.charCodeAt(0)) {
                throw 'ERR_WRONG_FORMAT';
            }
            line.shift();

            if (line.length < 10 || (line.length & 1)) {
                throw 'ERR_WRONG_FORMAT';
            }

            const fields = {};

            let byte = 0;
            let sum = 0;

            byte = hex2byte(line);
            sum += byte;

            let byteCount = byte;
            if (line.length !== (byteCount * 2 + 10)) {
                throw 'ERR_WRONG_FORMAT';
            }

            line.splice(0, 2);

            byte = hex2byte(line);
            sum += byte;
            fields.address = byte << 8;
            line.splice(0, 2);

            byte = hex2byte(line);
            sum += byte;
            fields.address += byte;
            line.splice(0, 2);

            byte = hex2byte(line);
            sum += byte;
            fields.recordType = byte;
            line.splice(0, 2);

            fields.data = [];

            while (line.length > 2) {
                let byte = hex2byte(line);
                sum += byte;
                fields.data.push(byte);
                line.splice(0, 2);
            }

            const checksum = hex2byte(line);
            if (checksum !== ((0x100 - (sum & 0xff)) & 0xff)) {
                throw 'ERR_WRONG_FORMAT';
            }

            switch (fields.recordType) {
                case 2: {
                    if (fields.data.length !== 2) {
                        throw 'ERR_WRONG_FORMAT';
                    }
                } break;

                case 3: {
                    if (fields.data.length !== 4) {
                        throw 'ERR_WRONG_FORMAT';
                    }
                } break;

                case 4: {
                    if (fields.data.length !== 2) {
                        throw 'ERR_WRONG_FORMAT';
                    }
                } break;

                case 5: {
                    if (fields.data.length !== 4) {
                        throw 'ERR_WRONG_FORMAT';
                    }
                } break;
            }

            return fields;
        }

        static #lines2blocks(lines) {
            const blocks = [];
            let startAddress = 0;

            for (let fields of lines) {
                switch (fields.recordType) {
                    case 0: {
                        blocks.push({
                            address: startAddress + fields.address,
                            data: fields.data,
                        });
                    } break;

                    case 1: {
                        return blocks;
                    } break;

                    case 2: {
                        startAddress = fields.data[0] * (2 ** 12);
                        startAddress += fields.data[1] * (2 ** 4);
                    } break;

                    case 4: {
                        startAddress = fields.data[0] * (2 ** 24);
                        startAddress += fields.data[1] * (2 ** 16);
                    } break;
                }
            }

            return blocks;
        }

        static #mergeBlocks(blocks) {
            const newBlocks = [];

            for (let block of blocks) {
                let idx = 0;

                if (newBlocks.length <= 0) {
                    newBlocks.push(block);
                    continue;
                }
                for (; idx < newBlocks.length; ++idx) {
                    const newBlk = newBlocks[idx];

                    if (block.address > newBlk.address && block.address < (newBlk.address + newBlk.data.length)) {
                        throw 'ERR_WRONG_FORMAT';
                    } else if (newBlk.address > block.address && newBlk.address < (block.address + block.data.length)) {
                        throw 'ERR_WRONG_FORMAT';
                    } else if (block.address === (newBlk.address + newBlk.data.length)) {
                        newBlk.data = [...newBlk.data, ...block.data];

                        if ((idx + 1) < newBlocks.length) {
                            const nextBlk = newBlocks[idx + 1];
                            if (nextBlk.address === (newBlk.address + newBlk.data.length)) {
                                newBlk.data = [...newBlk.data, ...nextBlk.data];
                            }
                            newBlocks.splice(idx + 1, 1);
                        }
                    } else if (newBlk.address === (block.address + block.data.length)) {
                        newBlk.data = [...block.data, ...newBlk.data];
                        newBlk.address = block.address;
                    } else if (block.address < newBlk.address) {
                        newBlocks.splice(idx, 0, block);
                    }
                }
            }

            return newBlocks;
        }

        static fromString = (input) => {
            input = [...input];
            const fieldsOfLines = [];
            const lines = this.#split2Lines(input);
            for (let line of lines) {
                fieldsOfLines.push(this.#splitLine2fields(line));
            }
            const blocks = this.#lines2blocks(fieldsOfLines);
            return this.#mergeBlocks(blocks);
        };
    };
};

export {
    intelhexCodec,
};

import fs from 'fs/promises';
let file = await fs.open('./test.hex');
let output = await fs.open('./output.txt', 'w');

let data = await file.readFile();

try {
    const blocks = intelhexCodec.decode.fromString(data);
} catch (e) {
    console.log('===:', e)
}
