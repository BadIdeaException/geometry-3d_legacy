const EPSILON = Number(new URL(import.meta.url).searchParams.get('epsilon') ?? 1.0e-8);

const Vector = (await import(`./vector.js?epsilon=${EPSILON}`)).default;
const Segment = (await import(`./segment.js?epsilon=${EPSILON}`)).default;
const Triangle = (await import(`./triangle.js?epsilon=${EPSILON}`)).default;
const Polygon = (await import(`./polygon.js?epsilon=${EPSILON}`)).default;
const Matrix = (await import(`./matrix.js?epsilon=${EPSILON}`)).default;
const Mesh = (await import(`./mesh.js?epsilon=${EPSILON}`)).default;

export {
	EPSILON,
	Vector,
	Segment,
	Triangle,
	Polygon,
	Matrix,
	Mesh
}