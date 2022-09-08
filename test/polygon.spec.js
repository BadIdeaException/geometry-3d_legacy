import Vector from '../src/vector.js';
import Polygon from '../src/polygon.js';
import pc from 'polygon-clipping';
import { readFileSync } from 'fs';

const EPSILON = 1.0e-8;

function reorder(actual, expected) {
	let index = actual.findIndex(vertex => expected[0].equals(vertex));
	if (index > -1)
		actual = actual.slice(index).concat(actual.slice(0, index));
	return actual;
}

function expectPolyEqual(actual, expected) {
	// Reorder actual polygon because it might be in reverse order/starting at a different vertex than the expected polygon
	actual = reorder(actual, expected);
	// Now they should be deeply equal. Unfortunately we can't use deep equality directly here though,
	// because we need to account for floating-point imprecision.
	// So we need to compare every vertex by hand here.	
	expected.forEach((vertex, index) => {
		expect(actual[index].x).to.be.approximately(vertex.x, EPSILON);
		expect(actual[index].y).to.be.approximately(vertex.y, EPSILON);
	});
}

function expectMultiPolyEqual(actual, expected) {
	expect(actual).to.be.an('array').with.lengthOf(expected.length);
	expected.forEach(expectedComponent => {
		let actualComponent = actual.find(component => component.every(actualVertex => expectedComponent.some(expectedVertex => Math.abs(actualVertex.x - expectedVertex.x) < EPSILON && Math.abs(actualVertex.y - expectedVertex.y) < EPSILON)));
		expect(actualComponent).to.exist;
		expectPolyEqual(actualComponent, expectedComponent);
	});
}

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
	});

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
			expect(polygon.equals(other)).to.be.true;

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

	describe('.intersect', function() {
		it('should throw when attempting to intersect polygons that are not co-planar', function() {
			const polygon = new Polygon(
				new Vector(1, 1, 1),
				new Vector(3, 1, 1),
				new Vector(2, 5, 1),
				new Vector(-3, 5, 1),
				new Vector(-2, 2, 1),
				new Vector(1, 3, 1)
			);
			let clip = new Polygon(polygon.map(vertex => vertex.add(polygon.normal)));
			expect(polygon.intersect.bind(polygon, clip), 'parallel but not co-planar').to.throw();
			
			clip = new Polygon(({ x, y} , index) => new Vector(x, y, index));
			expect(polygon.intersect.bind(polygon, clip), 'not parallel').to.throw();
		});

		
		// We will run this test with the polygons lying on two different planes.
		// The first time around, they will be on the x-y-plane, to better expose errors in the intersection calculation.
		// The second time, they will be on an arbitrary (skew) plane, to better show faulty re-extrapolation
		// to the original plane.
		// eslint-disable-next-line mocha/no-setup-in-describe
		[
			// z-coordinate for given (x,y) for the x-y-plane
			{ z: () => 0, description: 'intersect co-planar overlapping polygons on the x-y-plane' },
			// z-coordinate for given (x,y) for the (arbitrary) plane -2x + 3y + 4z -5 = 0
			{ z: ({ x, y }) => (2*x - 3*y + 5) / 4, description: 'intersect co-planar overlapping on an arbitrary (skew) plane' }
		].forEach(({ z, description }) => it(`should ${description}`, function() {
			const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/intersect/subject.json'))
				.map(vertex => new Vector({ ...vertex, z: z(vertex) })));
			const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/intersect/clip.json'))
				.map(vertex => new Vector({ ...vertex, z: z(vertex) })));
			
			const expected = JSON.parse(readFileSync('test/fixtures/intersect/expected.json'))
					.map(poly =>
					poly.map(vertex => new Vector({ ...vertex, z: z(vertex) })));

			let result = polygon.intersect(clip);
			expect(result).to.be.an('array').with.lengthOf(2);
			expectMultiPolyEqual(result, expected);
		}));
	});

	describe('.subtract', function() {
		it('should subtract two co-planar overlapping polygons', function() {
			const z = () => 0;

			const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/subtract/subject.json'))
				.map(vertex => new Vector({ ...vertex, z: z(vertex) })));
			const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/subtract/clip.json'))
				.map(vertex => new Vector({ ...vertex, z: z(vertex) })));
			
			const expected = JSON.parse(readFileSync('test/fixtures/subtract/expected.json'))
					.map(poly =>
					poly.map(vertex => new Vector({ ...vertex, z: z(vertex) })));

			let result = polygon.subtract(clip);
			expect(result).to.be.an('array').with.lengthOf(2);
			expectMultiPolyEqual(result, expected);
		});

		describe('with hole', function() {
			it('should break up the result if there is a hole', function() {
				const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/subtract-with-hole-general/subject.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));

				const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/subtract-with-hole-general/clip.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const expected = JSON.parse(readFileSync('test/fixtures/subtract-with-hole-general/expected.json'))
					.map(poly => poly.map(vertex => new Vector({ ...vertex, z: 0 })));

				let result = polygon.subtract(clip);
				expect(result).to.be.an('array').with.lengthOf(2);
				expectMultiPolyEqual(result, expected);
			});
			
			it('should not create superfluous vertices on the subject when breaking up holes', function() {
				const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/subtract-with-hole-no-superfluous-on-subject/subject.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/subtract-with-hole-no-superfluous-on-subject/clip.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const expected = JSON.parse(readFileSync('test/fixtures/subtract-with-hole-no-superfluous-on-subject/expected.json'))
					.map(poly => poly.map(vertex => new Vector({ ...vertex, z: 0 })));
				
				let result = polygon.subtract(clip);
				expect(result).to.be.an('array').with.lengthOf(2);
				expectMultiPolyEqual(result, expected);
			});		

			it('should not create superfluous vertices on the clip when breaking up holes', function() {
				const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/subtract-with-hole-no-superfluous-on-clip/subject.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/subtract-with-hole-no-superfluous-on-clip/clip.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const expected = JSON.parse(readFileSync('test/fixtures/subtract-with-hole-no-superfluous-on-clip/expected.json'))
					.map(poly => poly.map(vertex => new Vector({ ...vertex, z: 0 })));
				
				let result = polygon.subtract(clip);
				expect(result).to.be.an('array').with.lengthOf(2);
				expectMultiPolyEqual(result, expected);
			});		

			it('should not create superfluous vertices when subject and clip touch on the break-up point', function() {
				const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/subtract-with-hole-no-superfluous-when-touching/subject.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/subtract-with-hole-no-superfluous-when-touching/clip.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const expected = JSON.parse(readFileSync('test/fixtures/subtract-with-hole-no-superfluous-when-touching/expected.json'))
					.map(poly => poly.map(vertex => new Vector({ ...vertex, z: 0 })));
				
				let result = polygon.subtract(clip);
				expect(result).to.be.an('array').with.lengthOf(2);
				expectMultiPolyEqual(result, expected);
			});		
		});
	});


	it('.union', function() {
					// Subject looks like a letter "c"
			const subject =[
				{ x: 0, y: 0 },
				{ x: 0, y: 1 },
				{ x: -2, y: 1 },
				{ x: -2, y: 2 },
				{ x: 0, y: 2 },
				{ x: 0, y: 3 },
				{ x: -3, y: 3 },
				{ x: -3, y: 0 }
			];
			// Clip is the y-axis mirror image of subject
			const clip = subject.map(vertex => ({ x: Math.abs(vertex.x), y: vertex.y }));

			let result = pc.union(
				[ subject.map(vertex => [ vertex.x, vertex.y ]) ],
				[ clip.map(vertex => [ vertex.x, vertex.y ]) ])
			console.log(result[0]);		

	})
});