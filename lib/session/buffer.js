const logger = require('../utils/logger');

class CircularBuffer {
  constructor(maxSize = 100000) {
    this.maxSize = maxSize; // 100KB default
    this.buffer = [];
    this.totalSize = 0;
    this.currentSeq = 0;
  }

  // Calculate byte size of data
  getByteSize(data) {
    return Buffer.byteLength(data, 'utf8');
  }

  // Append data to buffer
  append(data) {
    const timestamp = Date.now();
    const seq = this.currentSeq++;
    const byteSize = this.getByteSize(data);

    const item = {
      seq,
      data,
      timestamp,
      size: byteSize
    };

    this.buffer.push(item);
    this.totalSize += byteSize;

    logger.debug(`Buffer: appended seq=${seq}, size=${byteSize}B, total=${this.totalSize}B`);

    // Remove old items if buffer exceeds max size
    while (this.totalSize > this.maxSize && this.buffer.length > 0) {
      const removed = this.buffer.shift();
      this.totalSize -= removed.size;
      logger.debug(`Buffer: removed seq=${removed.seq}, size=${removed.size}B (overflow)`);
    }

    return item;
  }

  // Get all items after a specific sequence number
  getAfter(seq) {
    return this.buffer.filter(item => item.seq > seq);
  }

  // Get all items
  getAll() {
    return [...this.buffer];
  }

  // Get current sequence number
  getCurrentSeq() {
    return this.currentSeq - 1;
  }

  // Clear buffer
  clear() {
    logger.debug('Buffer: cleared');
    this.buffer = [];
    this.totalSize = 0;
  }

  // Get buffer stats
  getStats() {
    return {
      items: this.buffer.length,
      totalSize: this.totalSize,
      maxSize: this.maxSize,
      currentSeq: this.currentSeq,
      oldestSeq: this.buffer.length > 0 ? this.buffer[0].seq : null,
      newestSeq: this.buffer.length > 0 ? this.buffer[this.buffer.length - 1].seq : null
    };
  }
}

module.exports = CircularBuffer;
