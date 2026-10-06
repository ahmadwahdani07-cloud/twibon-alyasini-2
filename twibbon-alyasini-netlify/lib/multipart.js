// Multipart form parser helper
function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuf = Buffer.from('--' + boundary);
  let start = 0;

  while (true) {
    const bIndex = buffer.indexOf(boundaryBuf, start);
    if (bIndex === -1) break;

    const nextBoundary = buffer.indexOf(boundaryBuf, bIndex + boundaryBuf.length);
    if (nextBoundary === -1) break;

    // Part is between bIndex + boundaryBuf.length and nextBoundary
    let partBuf = buffer.subarray(bIndex + boundaryBuf.length, nextBoundary);
    // Strip leading \r\n if present
    if (partBuf[0] === 13 && partBuf[1] === 10) {
      partBuf = partBuf.subarray(2);
    }
    // Strip trailing \r\n
    if (partBuf.length >= 2 && partBuf[partBuf.length - 2] === 13 && partBuf[partBuf.length - 1] === 10) {
      partBuf = partBuf.subarray(0, partBuf.length - 2);
    }

    // Split headers and body at \r\n\r\n (bytes 13, 10, 13, 10)
    const headerEnd = partBuf.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd !== -1) {
      const headerStr = partBuf.subarray(0, headerEnd).toString('utf8');
      const body = partBuf.subarray(headerEnd + 4);

      // Parse headers
      const dispMatch = headerStr.match(/content-disposition:\s*form-data;\s*([^;\r\n]+)(?:;\s*filename="([^"]*)")?/i);
      const nameMatch = headerStr.match(/name="([^"]+)"/i);
      const ctMatch = headerStr.match(/content-type:\s*([^\r\n]+)/i);

      if (nameMatch) {
        parts.push({
          name: nameMatch[1],
          filename: dispMatch && dispMatch[2] ? dispMatch[2] : null,
          contentType: ctMatch ? ctMatch[1].trim() : null,
          data: body
        });
      }
    }

    start = nextBoundary;
  }

  const fields = {};
  const files = {};
  for (const p of parts) {
    if (p.filename !== null) {
      files[p.name] = {
        filename: p.filename,
        contentType: p.contentType,
        data: p.data,
        size: p.data.length
      };
    } else {
      fields[p.name] = p.data.toString('utf8');
    }
  }

  return { fields, files };
}

module.exports = { parseMultipart };
