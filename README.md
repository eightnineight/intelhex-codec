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
