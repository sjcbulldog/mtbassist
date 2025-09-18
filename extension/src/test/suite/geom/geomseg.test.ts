/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';
import { GeomElement, GeomSegment } from '../../../geom/geom';

suite('GeomElement Tests', () => {
    
    suite('Constructor', () => {
        test('should create an empty GeomElement', () => {
            const element = new GeomElement();
            assert.strictEqual(element.length, 0);
            assert.strictEqual(element.segments.length, 0);
        });
    });

    suite('addSegment', () => {
        test('should add a single segment', () => {
            const element = new GeomElement();
            const segment = new GeomSegment(10, 5);
            
            element.addSegment(segment);
            
            assert.strictEqual(element.length, 1);
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 5);
        });

        test('should add multiple segments', () => {
            const element = new GeomElement();
            const segment1 = new GeomSegment(10, 5);
            const segment2 = new GeomSegment(20, 3);
            
            element.addSegment(segment1);
            element.addSegment(segment2);
            
            assert.strictEqual(element.length, 2);
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 5);
            assert.strictEqual(element.segments[1].start, 20);
            assert.strictEqual(element.segments[1].length, 3);
        });

        test('should create a copy of the segment (not reference)', () => {
            const element = new GeomElement();
            const segment = new GeomSegment(10, 5);
            
            element.addSegment(segment);
            segment.start = 99;
            segment.length = 99;
            
            // Original segment modification shouldn't affect the added segment
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 5);
        });
    });

    suite('addSegmentFromPoints', () => {
        test('should add segment from valid start and end points', () => {
            const element = new GeomElement();
            
            element.addSegmentFromPoints(10, 15);
            
            assert.strictEqual(element.length, 1);
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 5);
        });

        test('should handle equal start and end points (zero length)', () => {
            const element = new GeomElement();
            
            element.addSegmentFromPoints(10, 10);
            
            assert.strictEqual(element.length, 1);
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 0);
        });

        test('should throw error when end < start', () => {
            const element = new GeomElement();
            
            assert.throws(() => {
                element.addSegmentFromPoints(15, 10);
            }, Error, 'End point must be greater than or equal to start point');
        });

        test('should handle negative coordinates', () => {
            const element = new GeomElement();
            
            element.addSegmentFromPoints(-10, -5);
            
            assert.strictEqual(element.length, 1);
            assert.strictEqual(element.segments[0].start, -10);
            assert.strictEqual(element.segments[0].length, 5);
        });
    });

    suite('addSegmentFromPointAndLength', () => {
        test('should add segment from valid start point and length', () => {
            const element = new GeomElement();
            
            element.addSegmentFromPointAndLength(10, 5);
            
            assert.strictEqual(element.length, 1);
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 5);
        });

        test('should handle zero length', () => {
            const element = new GeomElement();
            
            element.addSegmentFromPointAndLength(10, 0);
            
            assert.strictEqual(element.length, 1);
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 0);
        });

        test('should throw error for negative length', () => {
            const element = new GeomElement();
            
            assert.throws(() => {
                element.addSegmentFromPointAndLength(10, -5);
            }, Error, 'Length must be non-negative');
        });

        test('should handle negative start point', () => {
            const element = new GeomElement();
            
            element.addSegmentFromPointAndLength(-10, 5);
            
            assert.strictEqual(element.length, 1);
            assert.strictEqual(element.segments[0].start, -10);
            assert.strictEqual(element.segments[0].length, 5);
        });
    });

    suite('segments getter', () => {
        test('should return empty array for new element', () => {
            const element = new GeomElement();
            
            const segments = element.segments;
            
            assert.strictEqual(segments.length, 0);
            assert.ok(Array.isArray(segments));
        });

        test('should return all added segments', () => {
            const element = new GeomElement();
            element.addSegmentFromPoints(10, 15);
            element.addSegmentFromPoints(20, 25);
            
            const segments = element.segments;
            
            assert.strictEqual(segments.length, 2);
            assert.strictEqual(segments[0].start, 10);
            assert.strictEqual(segments[0].length, 5);
            assert.strictEqual(segments[1].start, 20);
            assert.strictEqual(segments[1].length, 5);
        });
    });

    suite('clear', () => {
        test('should clear all segments', () => {
            const element = new GeomElement();
            element.addSegmentFromPoints(10, 15);
            element.addSegmentFromPoints(20, 25);
            
            element.clear();
            
            assert.strictEqual(element.length, 0);
            assert.strictEqual(element.segments.length, 0);
        });

        test('should work on empty element', () => {
            const element = new GeomElement();
            
            element.clear();
            
            assert.strictEqual(element.length, 0);
            assert.strictEqual(element.segments.length, 0);
        });
    });

    suite('length getter', () => {
        test('should return 0 for empty element', () => {
            const element = new GeomElement();
            
            assert.strictEqual(element.length, 0);
        });

        test('should return correct count after adding segments', () => {
            const element = new GeomElement();
            
            assert.strictEqual(element.length, 0);
            
            element.addSegmentFromPoints(10, 15);
            assert.strictEqual(element.length, 1);
            
            element.addSegmentFromPoints(20, 25);
            assert.strictEqual(element.length, 2);
            
            element.addSegmentFromPoints(30, 35);
            assert.strictEqual(element.length, 3);
        });

        test('should return correct count after clearing', () => {
            const element = new GeomElement();
            element.addSegmentFromPoints(10, 15);
            element.addSegmentFromPoints(20, 25);
            
            element.clear();
            
            assert.strictEqual(element.length, 0);
        });
    });

    suite('merge', () => {
        test('should merge adjacent segments', () => {
            const element = new GeomElement();
            element.addSegmentFromPoints(10, 15); // start: 10, length: 5
            element.addSegmentFromPoints(15, 20); // start: 15, length: 5 (adjacent)
            
            element.merge();
            
            assert.strictEqual(element.length, 1);
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 10);
        });

        test('should merge multiple adjacent segments', () => {
            const element = new GeomElement();
            element.addSegmentFromPoints(10, 15); // start: 10, length: 5
            element.addSegmentFromPoints(15, 20); // start: 15, length: 5
            element.addSegmentFromPoints(20, 25); // start: 20, length: 5
            
            element.merge();
            
            assert.strictEqual(element.length, 1);
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 15);
        });

        test('should not merge non-adjacent segments', () => {
            const element = new GeomElement();
            element.addSegmentFromPoints(10, 15); // start: 10, length: 5
            element.addSegmentFromPoints(20, 25); // start: 20, length: 5 (gap of 5)
            
            element.merge();
            
            assert.strictEqual(element.length, 2);
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 5);
            assert.strictEqual(element.segments[1].start, 20);
            assert.strictEqual(element.segments[1].length, 5);
        });

        test('should handle mixed adjacent and non-adjacent segments', () => {
            const element = new GeomElement();
            element.addSegmentFromPoints(10, 15); // start: 10, length: 5
            element.addSegmentFromPoints(15, 20); // start: 15, length: 5 (adjacent to first)
            element.addSegmentFromPoints(25, 30); // start: 25, length: 5 (gap)
            element.addSegmentFromPoints(30, 35); // start: 30, length: 5 (adjacent to third)
            
            element.merge();
            
            assert.strictEqual(element.length, 2);
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 10);
            assert.strictEqual(element.segments[1].start, 25);
            assert.strictEqual(element.segments[1].length, 10);
        });

        test('should handle single segment', () => {
            const element = new GeomElement();
            element.addSegmentFromPoints(10, 15);
            
            element.merge();
            
            assert.strictEqual(element.length, 1);
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 5);
        });

        test('should handle empty element', () => {
            const element = new GeomElement();
            
            element.merge();
            
            assert.strictEqual(element.length, 0);
        });

        test('should merge zero-length segments', () => {
            const element = new GeomElement();
            element.addSegmentFromPoints(10, 10); // start: 10, length: 0
            element.addSegmentFromPoints(10, 15); // start: 10, length: 5 (adjacent)
            
            element.merge();
            
            assert.strictEqual(element.length, 1);
            assert.strictEqual(element.segments[0].start, 10);
            assert.strictEqual(element.segments[0].length, 5);
        });
    });

    suite('Integration Tests', () => {
        test('should handle complex workflow', () => {
            const element = new GeomElement();
            
            // Add several segments
            element.addSegmentFromPoints(0, 5);
            element.addSegmentFromPoints(5, 10);
            element.addSegmentFromPoints(15, 20);
            element.addSegmentFromPointAndLength(20, 5);
            
            assert.strictEqual(element.length, 4);
            
            // Merge adjacent segments
            element.merge();
            
            assert.strictEqual(element.length, 2);
            assert.strictEqual(element.segments[0].start, 0);
            assert.strictEqual(element.segments[0].length, 10);
            assert.strictEqual(element.segments[1].start, 15);
            assert.strictEqual(element.segments[1].length, 10);
            
            // Clear and start over
            element.clear();
            assert.strictEqual(element.length, 0);
            
            // Add new segments
            element.addSegment(new GeomSegment(100, 50));
            assert.strictEqual(element.length, 1);
            assert.strictEqual(element.segments[0].start, 100);
            assert.strictEqual(element.segments[0].length, 50);
        });
    });
});

suite('GeomSegment Tests', () => {
    test('should create segment with start and length', () => {
        const segment = new GeomSegment(10, 5);
        
        assert.strictEqual(segment.start, 10);
        assert.strictEqual(segment.length, 5);
    });

    test('should handle zero values', () => {
        const segment = new GeomSegment(0, 0);
        
        assert.strictEqual(segment.start, 0);
        assert.strictEqual(segment.length, 0);
    });

    test('should handle negative values', () => {
        const segment = new GeomSegment(-10, 5);
        
        assert.strictEqual(segment.start, -10);
        assert.strictEqual(segment.length, 5);
    });

    test('should allow modification of properties', () => {
        const segment = new GeomSegment(10, 5);
        
        segment.start = 20;
        segment.length = 10;
        
        assert.strictEqual(segment.start, 20);
        assert.strictEqual(segment.length, 10);
    });
});