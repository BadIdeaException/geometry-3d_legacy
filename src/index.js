import VectorFactory from './vector.js';
import SegmentFactory from './segment.js';
import TriangleFactory from './triangle.js';
import PolygonFactory from './polygon.js';
import MatrixFactory from './matrix.js';
import MeshFactory from './mesh.js';

const EPSILON = Number(new URL(import.meta.url).searchParams.get('epsilon') ?? 1.0e-8);

const Vector = VectorFactory(EPSILON);
const Segment = SegmentFactory(EPSILON);
const Triangle = TriangleFactory(EPSILON);
const Polygon = PolygonFactory(EPSILON);
const Matrix = MatrixFactory(EPSILON);
const Mesh = MeshFactory(EPSILON);

export {
	EPSILON,
	Vector,
	Segment,
	Triangle,
	Polygon,
	Matrix,
	Mesh
}