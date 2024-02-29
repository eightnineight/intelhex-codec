# intelhex-codec

#### decode intel HEX format, and encode data to intel HEX format.

## Install

```
npm install @eightnineight/intelhex-codec
```

## Usage

```js
import { intelhexCodec } from 'intelhex-codec';
import fs from 'fs/promises';

let file = await fs.open('./test.hex');
let inputString = await file.readFile();
const blocks = intelhexCodec.decode.fromString(inputString);
const hexString = intelhexCodec.encode.asString(blocks);
await fs.writeFile('./output.hex', hexString);

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
