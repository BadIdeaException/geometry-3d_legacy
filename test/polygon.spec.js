import { readFileSync } from 'fs';

const EPSILON = 1.0e-8;
const Vector = (await import(`../src/vector.js?epsilon=${EPSILON}`)).default;
const Polygon = (await import(`../src/polygon.js?epsilon=${EPSILON}`)).default;
const Triangle = (await import(`../src/triangle.js?epsilon=${EPSILON}`)).default;

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
		expect(actualComponent).to.be.an.instanceof(Polygon);
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

		it('should be pointing "outward"', function() {
			const vertices = [
				{ x: 1, y: 1, z: 3 },
				{ x: 3, y: 1, z: 5 },
				{ x: 1, y: 3, z: 5 }
			].map(vertex => new Vector({ ...vertex, z: -1 }));
			const polygon = new Polygon(vertices);debugger
			[...'xyz'].forEach(dim => expect(polygon.normal[dim]).to.be.at.least(0));
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

	// describe.skip('.cut', function() {
	// 	let polygon;
	// 	const z = ({ x, y }) => -(5*x - 3*y + 8) / 2;
	// 	// eslint-disable-next-line mocha/no-setup-in-describe
	// 	const vertices = [
	// 		{ x: 1, y: 1 },
	// 		{ x: 5, y: 5 },
	// 		{ x: 4, y: 8 },
	// 		{ x: 0, y: 5 },
	// 		{ x: 2, y: 4 }
	// 	].map(vertex => new Vector({ ...vertex, z: z(vertex) }));

	// 	beforeEach(function() {
	// 		polygon = new Polygon(vertices);
	// 	});

	// 	it('should not cut the polygon if it does not intersect the cut plane', function() {
	// 		const distance = 20;
	// 		[
	// 			new Vector(1, 0, 0),
	// 			new Vector(0, 1, 0),
	// 			new Vector(0, 0, 1),
	// 			new Vector(1, 1, 1)
	// 		].forEach(normal => {
	// 			expect(polygon.cut(normal, -distance)).to.be.an('object').with.property('above').that.deep.equals(polygon);
	// 			expect(polygon.cut(normal, +distance)).to.be.an('object').with.property('below').that.deep.equals(polygon);
	// 		});
	// 	});

	// 	it('should have the polygon in both above and below if it is co-planar with the cut plane', function() {			
	// 		const normal = polygon.normal;
	// 		const offset = Vector.dot(polygon.normal, polygon[0]);
			
	// 		let cut = polygon.cut(normal, offset);
	// 		expect(cut).to.be.an('object').with.all.keys('above', 'below');
	// 		expect(cut.above).to.deep.equal(polygon);
	// 		expect(cut.below).to.deep.equal(polygon);
	// 	});

	// 	it.only('should', function() {			
	// 		const normal = new Vector(1,0,0);
	// 		const distance = 2;
	// 		polygon = new Polygon(polygon.map(vertex => ({ ...vertex, z: 0 })));
	// 		let cut = polygon.cut(normal, distance)
	// 	});
	// 	it('should cut the polygon into above and below parts if it intersects the cut plane', function() {			
	// 		const normal = new Vector(1, 1, 1);
	// 		const distance = 2;
	// 		let cut = polygon.cut(normal, distance);

	// 		expect(cut).to.be.an('object').with.keys('above', 'below');
	// 		expect(cut.below).to.not.be.empty;
	// 		expect(cut.above).to.not.be.empty;

	// 		// All of tri's vertices should be present
	// 		expect(cut.above.concat(cut.below)).to.include.members(polygon);
	// 		let intersections = cut.above.filter(v => !polygon.includes(v));
	// 		expect(intersections).to.have.lengthOf(2);
	// 		expect(cut.above.length + cut.below.length).to.equal(polygon.length + 2 * intersections.length);
	// 		intersections.forEach(isect => {
	// 			// Each of them should also be in below
	// 			expect(cut.below).to.contain(isect);
	// 			// Each of them should be on the cut plane
	// 			expect(Vector.dot(normal, isect)).to.be.approximately(distance, EPSILON);
	// 		});

	// 		cut.above.forEach(vertex => expect(Vector.dot(normal, vertex)).to.be.at.least(distance - EPSILON));
	// 		cut.below.forEach(vertex => expect(Vector.dot(normal, vertex)).to.be.at.most(distance + EPSILON));
	// 	});

	// 	it('should not cut the polygon at vertices merely touching the cut plane', function() {
	// 		const normal = Vector.cross(polygon[3].subtract(polygon[0]), polygon.normal);
	// 		const distance = Vector.dot(normal, polygon[0]);

	// 		let cut = polygon.cut(normal, distance);			
	// 		expect(cut.below).to.be.empty;
	// 		expect(cut.above).to.deep.equal(polygon);
	// 	});

	// 	it('should ignore edges running along the cut plane', function() {
	// 		const normal = Vector.cross(polygon[4].subtract(polygon[0]), polygon.normal);
	// 		const distance = Vector.dot(normal, polygon[0]);

	// 		let cut = polygon.cut(normal, distance);			
	// 		expect(cut.above.concat(cut.below)).to.not.include(polygon[4]);
	// 		expect.fail()
	// 	});
	// });

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
			const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/intersect/subject.json'))
				.map(vertex => new Vector({ ...vertex, z: z(vertex) })));
			const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/intersect/clip.json'))
				.map(vertex => new Vector({ ...vertex, z: z(vertex) })));
			
			const expected = JSON.parse(readFileSync('test/fixtures/polygon/intersect/expected.json'))
					.map(poly =>
					poly.map(vertex => new Vector({ ...vertex, z: z(vertex) })));

			let result = polygon.intersect(clip);
			expect(result).to.be.an('array').with.lengthOf(2);
			expectMultiPolyEqual(result, expected);
		}));
	});

	describe('.subtract', function() {
		it('should subtract two co-planar overlapping polygons', function() {
			const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/subtract/subject.json'))
				.map(vertex => new Vector({ ...vertex, z: 0 })));
			const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/subtract/clip.json'))
				.map(vertex => new Vector({ ...vertex, z: 0 })));
			
			const expected = JSON.parse(readFileSync('test/fixtures/polygon/subtract/expected.json'))
					.map(poly =>
					poly.map(vertex => new Vector({ ...vertex, z: 0 })));

			let result = polygon.subtract(clip);
			expect(result).to.be.an('array').with.lengthOf(2);
			expectMultiPolyEqual(result, expected);
		});

		describe('with hole', function() {
			it('should break up the result if there is a hole', function() {
				const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/subtract-with-hole-general/subject.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));

				const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/subtract-with-hole-general/clip.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const expected = JSON.parse(readFileSync('test/fixtures/polygon/subtract-with-hole-general/expected.json'))
					.map(poly => poly.map(vertex => new Vector({ ...vertex, z: 0 })));
debugger
				let result = polygon.subtract(clip);
				expect(result).to.be.an('array').with.lengthOf(2);
				expectMultiPolyEqual(result, expected);
			});
			
			it('should not create superfluous vertices on the subject when breaking up holes', function() {
				const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/subtract-with-hole-no-superfluous-on-subject/subject.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/subtract-with-hole-no-superfluous-on-subject/clip.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const expected = JSON.parse(readFileSync('test/fixtures/polygon/subtract-with-hole-no-superfluous-on-subject/expected.json'))
					.map(poly => poly.map(vertex => new Vector({ ...vertex, z: 0 })));
				
				let result = polygon.subtract(clip);
				expect(result).to.be.an('array').with.lengthOf(2);
				expectMultiPolyEqual(result, expected);
			});		

			it('should not create superfluous vertices on the clip when breaking up holes', function() {
				const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/subtract-with-hole-no-superfluous-on-clip/subject.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/subtract-with-hole-no-superfluous-on-clip/clip.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const expected = JSON.parse(readFileSync('test/fixtures/polygon/subtract-with-hole-no-superfluous-on-clip/expected.json'))
					.map(poly => poly.map(vertex => new Vector({ ...vertex, z: 0 })));
				
				let result = polygon.subtract(clip);
				expect(result).to.be.an('array').with.lengthOf(2);
				expectMultiPolyEqual(result, expected);
			});		

			it('should not create superfluous vertices when subject and clip touch on the break-up point', function() {
				const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/subtract-with-hole-no-superfluous-when-touching/subject.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/subtract-with-hole-no-superfluous-when-touching/clip.json'))
					.map(vertex => new Vector({ ...vertex, z: 0 })));
				const expected = JSON.parse(readFileSync('test/fixtures/polygon/subtract-with-hole-no-superfluous-when-touching/expected.json'))
					.map(poly => poly.map(vertex => new Vector({ ...vertex, z: 0 })));
				
				let result = polygon.subtract(clip);
				expect(result).to.be.an('array').with.lengthOf(2);
				expectMultiPolyEqual(result, expected);
			});		
		});

		it('should break up the result where a vertex touches an edge', function() {
			// This test is based on real-world data (which is why the data in subject and clip is so screwy). 
			// Generally, Polybooljs does a pretty good job of breaking up result polygons that have a vertex
			// touching one of the other edges. On this data, however, it fails. 
			// (See https://github.com/velipso/polybooljs/issues/40)
			// 
			// This test ensures that the manual error correction in polygon.js catches and repairs such failures.
			const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/subtract-vertex-on-edge/subject.json')))
				.map(vertex => new Vector(vertex));
			const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/subtract-vertex-on-edge/clip.json')))
				.map(vertex => new Vector(vertex));
			
			let result = polygon.subtract(clip);
			expect(result).to.have.lengthOf(2);
		});
	});

	describe('.add', function() {
		it('should add two co-planar overlapping polygons', function() {
			const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/add/subject.json'))
				.map(vertex => new Vector({ ...vertex, z: 0 })));
			const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/add/clip.json'))
				.map(vertex => new Vector({ ...vertex, z: 0 })));
			
			const expected = JSON.parse(readFileSync('test/fixtures/polygon/add/expected.json'))
					.map(poly =>
					poly.map(vertex => new Vector({ ...vertex, z: 0 })));

			let result = polygon.add(clip);
			expect(result).to.be.an('array').with.lengthOf(1);
			expectMultiPolyEqual(result, expected);
		});		
	
		it('should break up the result if there is a hole', function() {
			const polygon = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/add-with-hole/subject.json'))
				.map(vertex => new Vector({ ...vertex, z: 0 })));

			const clip = new Polygon(JSON.parse(readFileSync('test/fixtures/polygon/add-with-hole/clip.json'))
				.map(vertex => new Vector({ ...vertex, z: 0 })));
			const expected = JSON.parse(readFileSync('test/fixtures/polygon/add-with-hole/expected.json'))
				.map(poly => poly.map(vertex => new Vector({ ...vertex, z: 0 })));

			let result = polygon.add(clip);
			expect(result).to.be.an('array').with.lengthOf(2);
			expectMultiPolyEqual(result, expected);
		});			
	});

	describe('.contains', function() {
		const vertices = [
			new Vector(1, 1, 1),
			new Vector(5, 5, 1),
			new Vector(4, 8, 1),
			new Vector(0, 5, 1),
			new Vector(1, 3, 1)
		];

		it('should return true for a point inside the polygon', function() {
			expect(new Polygon(vertices).contains(new Vector(4, 5, 1))).to.be.true;
		});
		it('should return false for a point outside the polygon', function() {
			expect(new Polygon(vertices).contains(new Vector(12, 2, 1))).to.be.false;			
		});
		it('should return true for a point on one of the polygon\'s edges', function() {
			let p = vertices[0].add(vertices[1].subtract(vertices[0]).scale(0.5));
			expect(new Polygon(vertices).contains(p)).to.be.true;
		});
	});

	it.only('', function(){
		const T = new Triangle(JSON.parse(readFileSync('T.json')).map(v=>new Vector(v)));
		const above = new Polygon(JSON.parse(readFileSync('above.json')).map(v=>new Vector(v)));
		debugger
		const result = T.subtract(above);
	})
});