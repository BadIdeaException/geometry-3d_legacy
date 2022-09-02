import Vector from '../src/vector.js';
import Polygon from '../src/polygon.js';

const EPSILON = 1.0e-8;

describe('Polygon', function() {
	describe('constructor', function() {
		const vertices = [
			new Vector(1, 1, 1),
			new Vector(5, 5, 1),
			new Vector(4, 8, 1),
			new Vector(0, 5, 1),
			new Vector(1, 3, 1)
		];

		it('should construct a polygon from points', function() {
			expect(new Polygon(...vertices)).to.deep.equal(vertices);
		});
		it('should construct a polygon from an array of points', function() {
			expect(new Polygon(vertices)).to.deep.equal(vertices);
		});
	})

	describe('.normal', function() {
		it('should compute the normal for a polygon with three or more vertices', function() {
			const fixtures = [
				{ 
					vertices: [
						{ x: 1, y: 1 },
						{ x: 5, y: 5 },
						{ x: 4, y: 8 },
						{ x: 0, y: 5 },
						{ x: 1, y: 3 }
					],
					plane: { a: 0, b: 0, c: 1, d: 1 }
				},
				{
					vertices: [
						{ x: 1, y: 1 },
						{ x: -3, y: 4 },
						{ x: 5, y: 8 },
						{ x: 5, y: -7 },
						{ x: 0, y: -5 },
					],
					plane: { a: 24, b: 1, c: -14, d: -11 }
				}
			];
			fixtures.forEach(({ vertices, plane }) => {
				const { a, b, c, d } = plane;
				// Calculate z-coordinate from plane equation for given x and y				
				const z = (x, y) => -(a * x + b * y + d) / c;
				vertices = vertices.map(({ x, y }) => ({ x, y, z: z(x, y) }));
				const normal = new Polygon(vertices).normal.unit();
				const expected = new Vector(a, b, c).unit();
				['x','y','z'].forEach(dim => 
					expect(normal[dim]).to.be.approximately(expected[dim], EPSILON));
			});
		});

		it('should be undefined if there are less than three vertices', function() {
			let vertices = [
				new Vector(1, 1, 1)
			];
			expect(new Polygon(vertices).normal).to.be.undefined;
			vertices.push(new Vector(5, 1, 1));
			expect(new Polygon(vertices).normal).to.be.undefined;
			vertices.push(new Vector(3, 3, 1));
			expect(new Polygon(vertices).normal).to.exist;
		});
	});

	describe('.isPlanar', function() {
		it('should return true iff all the polygon\'s points lie in the same plane', function() {
			let polygon = new Polygon(
				new Vector(1, 1, 1),
				new Vector(5, 5, 1),
				new Vector(4, 8, 1),
				new Vector(0, 5, 1),
				new Vector(1, 3, 1)
			);
			expect(polygon.isPlanar()).to.be.true;

			polygon[1].z = 0;
			expect(polygon.isPlanar()).to.be.false;
		});
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
			other = new Polygon(...other.slice(idx).concat(other.slice(0, idx)));
			expect(polygon.equals(other)).to.be.true;
		});

		it('should not equal another polygon with different vertices', function() {
			// Construct a polygon from the points, leaving out the second vertex
			let other = new Polygon(...polygon.filter((v, i) => i !== 1));
			expect(polygon.equals(other)).to.be.false;
		});
	});

	describe('.isConvex', function() {
		let polygon;
		beforeEach(function() {
			polygon = new Polygon(
				new Vector(1, 1, 1),
				new Vector(5, 5, 1),
				new Vector(4, 8, 1),
				new Vector(0, 6, 1),
				new Vector(-1, 3, 1)
			);
		});

		it('should return true for convex polygons, false for concave ones', function() {
			
			expect(polygon.isConvex()).to.be.true;
			polygon[4].x = 2;
			expect(polygon.isConvex()).to.be.false;
		});
	});
});