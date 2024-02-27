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

const byte2hex = (byte) => {
    return ((byte >> 4) & 0x0f).toString(16) + (byte & 0x0f).toString(16);
}
const hex2byte = (hex) => {
    let byte = 0;
    for (let nibble of hex) {
        byte <<= 4;

        if (isDigit(nibble)) {
            byte += nibble - 0x30;
        } else if (isUppercaseLetter(nibble)) {
            byte += nibble - 55;
        } else { // isLowercaseLetter(nibble)
            byte += nibble - 87;
        }
    }
    return byte;
}

class intelhexCodec {
    static encode = class {
        static asString = (input) => {

        };
    };

    static decode = class {
        static split2Lines = (input) => {
            const lines = input.split(/[\r\n]/);
            lines.filter((line) => {
                return (line.trim() !== '');
            })
        }
        static splitLine2fields = (line) => {

        }

        static fromString = (input) => {
            const fieldsOfLines = [];
            const lines = this.split2Lines(input);
            for (let line of lines) {
                fieldsOfLines.push(this.splitLine2fields(line));
            }
        };
    };
};

const intelhexCodec = {
    encode: {
        asString,
    },
    decode: {
        fromString,
    },
};

export {
    intelhexCodec,
};
