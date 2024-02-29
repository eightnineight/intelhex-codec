# intelhex-codec

#### decode intel HEX format, and encode data to intel HEX format.

## Install

```
npm install @eightnineight/intelhex-codec
```

## Usage

```js
import { intelhexCodec } from "intelhex-codec";
import fs from "fs/promises";

let file = await fs.open("./test.hex");
let inputString = await file.readFile();
const blocks = intelhexCodec.decode.fromString(inputString);

const hexString = intelhexCodec.encode.asString(blocks);
await fs.writeFile("./output.hex", hexString);

// Set the max number of data bytes in each record line to 10 bytes. (default 16 bytes)
const hexString2 = intelhexCodec.encode.asString(blocks, 10);
await fs.writeFile("./output2.hex", hexString2);
```

```js
//Blocks format example
const blocks = [
    { // block 1
        address: address1, // block 1 data start address
        data: [...], // block 1 data
    },
    { // block 2
        address: address2, // block 2 data start address
        data: [...], // block 2 data
    },
    //...
];
```
