import Vector from '../src/vector.js';
import Polygon from '../src/polygon.js';

describe('Polygon', function() {
	describe('.isPlanar', function() {

	});

	describe('.equals', function() {
		let polygon;
		beforeEach(function() {
			polygon = new Polygon(
				new Vector(1, 1, 1),
				new Vector(5, 5, 1),
				new Vector(4, 8, 1),
				new Vector(0, 5, 1),
				new Vector(1, 3, 1)
			);
		});

		it('should equal itself', function() {
			expect(polygon.equals(polygon)).to.be.true;	
		});

		it('should equal another polygon with the same vertices, regardless of start point', function() {
			let other = new Polygon(...polygon);
			expect(polygon.equals(other));

			const idx = 3;
			other = new Polygon(other.slice(idx).concat(other.slice(0, idx)));
			expect(polygon.equals(other));
		});

		it('should not equal another polygon with different vertices', function() {
			let other = new Polygon(...polygon.filter((v, i) => i !== 1));
			expect(polygon.equals(other)).to.be.false;
		});
	});
});