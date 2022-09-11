import MeshFactory from '../src/mesh.js';
import TriangleFactory from '../src/triangle.js';
import VectorFactory from '../src/vector.js';

const EPSILON = 1.0e-8;
const Vector = VectorFactory(EPSILON);
const Triangle = TriangleFactory(EPSILON);
const Mesh = MeshFactory(EPSILON);

describe('Mesh', function() {
	let mesh;
	beforeEach(function() {
		let faces = [
			new Triangle(new Vector(1, 1, 1), new Vector(5, 5, 5), new Vector(-2, 4, 4)),
			new Triangle(new Vector(1, 1, 1), new Vector(5, 5, 5), new Vector(3, -2, -4))
		];
		mesh = new Mesh(faces);
	});

	describe('.vertices', function() {
		it('should have all vertices of the mesh', function() {
			expect(new Mesh().vertices).to.be.an('array').that.is.empty;

			let expected = [];
			for (let face of mesh) expected = expected.concat(face);
			expect(mesh.vertices).to.be.an('array').with.members(expected);
		});
	});

	describe('.cut', function() {
		it('should leave the mesh unchanged if it doesn\'t intersect the cut plane', function() {
			[
				new Vector(1, 0, 0),
				new Vector(0, 1, 0),
				new Vector(0, 0, 1)
			].forEach(normal => 
				[ -10, +10 ].forEach(distance => {
					let cut = mesh.cut(normal, distance);
					let target = distance < 0 ? 'above' : 'below';
					let other = distance < 0 ? 'below' : 'above';

					expect(cut).to.be.an('object').with.all.keys('above', 'below');
					expect(cut[target]).to.deep.equal(mesh);
					expect(cut[other].isEmpty()).to.be.true;					
				})
			);
		});

		it('should contain the mesh in both above and below if it is co-planar with the cut plane', function() {
			const normal = new Vector(0,0,1);
			const distance = 3;
			mesh = new Mesh(
				new Triangle(new Vector(1, 1, distance), new Vector(5, 5, distance), new Vector(-2, 4, distance)),
				new Triangle(new Vector(1, 1, distance), new Vector(5, 5, distance), new Vector(3, 5, distance))
			);

			let cut = mesh.cut(normal, distance);
			expect(cut).to.be.an('object').with.all.keys('above', 'below');
			expect(cut.above).to.deep.equal(mesh);
			expect(cut.below).to.deep.equal(mesh);
		});

		it('should cut the mesh along the cut plane into above and below parts', function() {
			const normal = new Vector(1,1,1).unit();
			const distance = 3;

			const onPlane = mesh.vertices.filter(vertex => Vector.dot(normal, vertex) === distance);

			let cut = mesh.cut(normal, distance);
			expect(cut).to.be.an('object').with.all.keys('above', 'below');
			// The mesh contains a triangle that has a vertex on the cut plane. 
			// This vertex must be included in some face for both above and below.
			// 
			// (The below is generalized to allow for several vertices on the plane.)
			onPlane.forEach(vertex => {
				expect(cut.above).to.satisfy(mesh => mesh.some(face => face.includes(vertex)));
				expect(cut.below).to.satisfy(mesh => mesh.some(face => face.includes(vertex)));				
			});

			// All vertices of all faces in cut.above need to have a "dim" coordinate greater than or equal to offset
			expect(cut.above).to.satisfy(mesh => mesh.every(face => face.every(vertex => Vector.dot(vertex, normal) >= distance)));
			// All vertices of all faces in cut.below need to have a "dim" coordinate less than or equal to offset
			expect(cut.below).to.satisfy(mesh => mesh.every(face => face.every(vertex => Vector.dot(vertex, normal) <= distance)));
		});
	});

	describe('.split', function() {
		it('should leave an already contiguous mesh unchanged', function() {
			let split = mesh.split();
			expect(split).to.be.an('array').with.lengthOf(1);
			expect(split[0]).to.deep.equal(mesh);
		});

		it('should split a non-contiguous mesh into congiuous sub-meshes', function() {
			let submeshA = mesh.slice(); // Shallow copy
			let submeshB = [
				new Triangle(new Vector(-5, -5, -5), new Vector(-8, -8, -8), new Vector(-6, -7, -3)),
				new Triangle(new Vector(-5, -5, -5), new Vector(-8, -8, -8), new Vector(-10, -10, -10))
			];
			mesh = new Mesh(...submeshA, ...submeshB);

			let split = mesh.split();
			expect(split).to.be.an('array').with.deep.members([ submeshA, submeshB ]);
		});
	});
});