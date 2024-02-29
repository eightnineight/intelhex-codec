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
    return [((byte >> 4) & 0x0f).toString(16).toUpperCase(), (byte & 0x0f).toString(16).toUpperCase()];
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
        static #record2Line = (record) => {
            if (!record.data) {
                record.data = [];
            }
            const line = [':', ...byte2hex(record.data.length), ...byte2hex(record.offset >> 8), ...byte2hex(record.offset), ...byte2hex(record.type)];

            let checksum = 0;
            checksum += record.data.length;
            checksum += (record.offset >> 8) & 0xff;
            checksum += (record.offset) & 0xff;
            checksum += record.type;

            for (let data of record.data) {
                line.push(...byte2hex(data));
                checksum += data;
            }
            line.push(...byte2hex((0x100 - (checksum & 0xff)) & 0xff));
            line.push('\r', '\n');

            return line;
        }
        static #block2Lines = (block, byteCount = 16) => {
            if (!block?.data?.length) {
                return [];
            }

            const lines = [];

            if (byteCount > 255) {
                byteCount = 255;
            }

            lines.push(this.#record2Line({
                offset: 0,
                type: 4,
                data: [(block.address >> 24) & 0xff, (block.address >> 16) & 0xff],
            }));

            let offset = block.address & 0xffff;
            while (block?.data?.length) {
                let len = byteCount;
                if (block.data.length < byteCount) {
                    len = block.data.length;
                }
                lines.push(this.#record2Line({
                    offset,
                    type: 0,
                    data: block.data.splice(0, len),
                }));
                offset += len;
            }

            return lines;
        }

        static asString = (input, byteCount = 16) => {
            const blocks = [];
            for (let block of input) {
                if (block.data.length < 65536) {
                    blocks.push({
                        address: block.address,
                        data: [...block.data],
                    });
                } else {
                    blocks.push({
                        address: block.address,
                        data: block.slice(0, 65536),
                    });
                    block.push({
                        address: block.address + 65536,
                        data: block.slice(65536),
                    });
                }
            }

            const lines = [];

            for (let block of blocks) {
                lines.push(...this.#block2Lines(block, byteCount));
            }
            lines.push(this.#record2Line({
                offset: 0,
                type: 1,
                data: [],
            }))

            const hexString = [];
            for (let line of lines) {
                hexString.push(...line);
            }

            return hexString.join('');
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
        static #splitLine2Records = (line) => {
            if (line[0] !== ':'.charCodeAt(0)) {
                throw 'ERR_WRONG_FORMAT';
            }
            line.shift();

            if (line.length < 10 || (line.length & 1)) {
                throw 'ERR_WRONG_FORMAT';
            }

            const records = {};

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
            records.address = byte << 8;
            line.splice(0, 2);

            byte = hex2byte(line);
            sum += byte;
            records.address += byte;
            line.splice(0, 2);

            byte = hex2byte(line);
            sum += byte;
            records.type = byte;
            line.splice(0, 2);

            records.data = [];

            while (line.length > 2) {
                let byte = hex2byte(line);
                sum += byte;
                records.data.push(byte);
                line.splice(0, 2);
            }

            const checksum = hex2byte(line);
            if (checksum !== ((0x100 - (sum & 0xff)) & 0xff)) {
                throw 'ERR_WRONG_FORMAT';
            }

            switch (records.type) {
                case 2: {
                    if (records.data.length !== 2) {
                        throw 'ERR_WRONG_FORMAT';
                    }
                } break;

                case 3: {
                    if (records.data.length !== 4) {
                        throw 'ERR_WRONG_FORMAT';
                    }
                } break;

                case 4: {
                    if (records.data.length !== 2) {
                        throw 'ERR_WRONG_FORMAT';
                    }
                } break;

                case 5: {
                    if (records.data.length !== 4) {
                        throw 'ERR_WRONG_FORMAT';
                    }
                } break;
            }

            return records;
        }

        static #records2Blocks(records) {
            const blocks = [];
            let startAddress = 0;

            for (let record of records) {
                switch (record.type) {
                    case 0: {
                        if (record.data?.length) {
                            blocks.push({
                                address: startAddress + record.address,
                                data: record.data,
                            });
                        }
                    } break;

                    case 1: {
                        return blocks;
                    } break;

                    case 2: {
                        startAddress = record.data[0] * (2 ** 12);
                        startAddress += record.data[1] * (2 ** 4);
                    } break;

                    case 4: {
                        startAddress = record.data[0] * (2 ** 24);
                        startAddress += record.data[1] * (2 ** 16);
                    } break;
                }
            }

            return blocks;
        }

        static #mergeBlocks(blocks) {
            const newBlocks = [];

            for (let block of blocks) {
                let idx = 0;

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
                        break;
                    } else if (newBlk.address === (block.address + block.data.length)) {
                        newBlk.data = [...block.data, ...newBlk.data];
                        newBlk.address = block.address;
                        break;
                    } else if (block.address < newBlk.address) {
                        newBlocks.splice(idx, 0, block);
                        break;
                    }
                }
                if (idx >= newBlocks.length) {
                    newBlocks.push(block);
                }
            }

            return newBlocks;
        }

        static fromString = (input) => {
            input = [...input];
            const records = [];
            const lines = this.#split2Lines(input);
            for (let line of lines) {
                records.push(this.#splitLine2Records(line));
            }
            const blocks = this.#records2Blocks(records);
            return this.#mergeBlocks(blocks);
        };
    };
};

export {
    intelhexCodec,
};
