// Minimal atob/btoa polyfills for React Native environments without base-64
// Avoids pulling an extra dependency; sufficient for Firebase Storage uploadString.
(function initBase64Polyfill(globalObj) {
  if (globalObj && !globalObj.atob) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    globalObj.atob = function (input) {
      const str = String(input).replace(/=+$/, '');
      let output = '';
      if (str.length % 4 === 1) throw new Error('InvalidCharacterError');
      for (let bc = 0, bs = 0, buffer, i = 0; (buffer = str.charAt(i++));) {
        buffer = chars.indexOf(buffer);
        if (~buffer) {
          bs = bc % 4 ? (bs * 64) + buffer : buffer;
          if (bc++ % 4) output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
        }
      }
      return output;
    };
  }
  if (globalObj && !globalObj.btoa) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    globalObj.btoa = function (input) {
      let str = String(input);
      let output = '';
      for (let block = 0, charCode, i = 0, map = chars; str.charAt(i | 0) || ((map = '='), i % 1); output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))) {
        charCode = str.charCodeAt((i += 3 / 4));
        if (charCode > 0xFF) throw new Error('InvalidCharacterError');
        block = (block << 8) | charCode;
      }
      return output;
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : this));

