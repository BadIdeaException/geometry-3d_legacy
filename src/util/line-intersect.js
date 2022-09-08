import VectorFactory from '../vector.js';
import MatrixFactory from '../matrix.js';

export default function lineIntersect(a1, b1, a2, b2, EPSILON = 1.0e-8) {
	const Vector = VectorFactory(EPSILON);
	const Matrix = MatrixFactory(EPSILON);
	
	/*
		This function implements the algorithm by Ron Goldman, Univerity of Waterloo, 
		as found in Andrew Glassner, "Graphics Gems", p. 304
	 */
	
	// Helper function that computes the squared length of the vector v
	// This is computationally cheaper because it doesn't require to find the square root.
	function lengthSquared(v) {
		return v.x**2 + v.y**2 + v.z**2;
	}

	let direction1 = b1.subtract(a1);
	let direction2 = b2.subtract(a2);

	let cross = Vector.cross(direction1, direction2);
	let crossLengthSquared = lengthSquared(cross);
	if (crossLengthSquared < EPSILON) { // mathematically equivalent to cross.length === 0 but computationally cheaper
		// Lines are parallel
		// Are they also co-linear?
		let t = (a2.x - a1.x) / direction1.x;
		if (Math.abs(a2.y - a1.y - t * direction1.y) < EPSILON && Math.abs(a2.z - a1.z - t * direction1.z) < EPSILON) {
			return { a: a1, b: b1 };
		} else 
			return null;
	}
	let t1 = Matrix.fromColumns(a2.subtract(a1), direction2, cross).determinant() / crossLengthSquared;
	let t2 = Matrix.fromColumns(a2.subtract(a1), direction1, cross).determinant() / crossLengthSquared;

	// p1 and p2 are the closest points of approach. If they are equal, the segments intersect
	let p1 = a1.add(direction1.scale(t1));
	let p2 = a2.add(direction2.scale(t2));
	if (p1.equals(p2)) 
		return p1;
	else
		return null;
}

