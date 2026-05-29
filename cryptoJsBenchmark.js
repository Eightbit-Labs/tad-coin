const start = performance.now();
let count = 0;
for (let i = 0; i < 1000000; i++) {
  CryptoJS.SHA256("test" + i).toString();
  count++;
}
const elapsed = performance.now() - start;
console.log(`${count} hashes in ${elapsed.toFixed(2)}ms = ${(count / elapsed * 1000).toFixed(0)} hashes/sec`);
