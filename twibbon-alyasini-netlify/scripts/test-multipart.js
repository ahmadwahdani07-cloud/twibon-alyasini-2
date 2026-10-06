const { parseMultipart } = require('../lib/multipart.js');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const raw = 
`------WebKitFormBoundary7MA4YWxkTrZu0gW\r
Content-Disposition: form-data; name="title"\r
\r
Kampanye Test\r
------WebKitFormBoundary7MA4YWxkTrZu0gW\r
Content-Disposition: form-data; name="frame"; filename="test.png"\r
Content-Type: image/png\r
\r
FAKE_PNG_BYTES_12345\r
------WebKitFormBoundary7MA4YWxkTrZu0gW--\r
`;

const res = parseMultipart(Buffer.from(raw), boundary);
console.log('Parsed fields:', res.fields);
console.log('Parsed files:', Object.keys(res.files), res.files.frame ? res.files.frame.filename : null);
if (res.fields.title === 'Kampanye Test' && res.files.frame.data.toString() === 'FAKE_PNG_BYTES_12345') {
  console.log('TEST PASSED!');
} else {
  console.error('TEST FAILED!');
  process.exit(1);
}
