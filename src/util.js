import Vector from './vector.js';
import Matrix from './matrix.js';
import Constants from './constants.js';

export function lineIntersect(a1, b1, a2, b2) {
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
	if (crossLengthSquared < Constants.EPSILON) { // mathematically equivalent to cross.length === 0 but computationally cheaper
		// Lines are parallel
		// Are they also co-linear?
		let t = (a2.x - a1.x) / direction1.x;
		if (Math.abs(a2.y - a1.y - t * direction1.y) < Constants.EPSILON && Math.abs(a2.z - a1.z - t * direction1.z) < Constants.EPSILON) {
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

/**
 * Clips the polygon `subject` with the polygon `clip`, i.e. intersects them. Both polygons need to 
 * 1. be co-planar (this also implies that both need to be planar), 
 * 2. be convex,
 * 3. contain at least three points. 
 * 
 * Note that for performance reasons, the first two preconditions are not checked by this function. 
 * If they are violated, you will just get wrong results. 
 * 
 * @param  {Vector[]} subject The polygon to clip.
 * @param  {Vector[]} clip    The polygon to clip it with.
 * @return {Vector[]}         The intersection of the two. If they do not intersect, returns an empty array.
 * Note that the first and last points may be identical in the result.
 */
export function clipPolygon(subject, clip) {
	/*
		Implements the Sutherland-Hodgman algorithm for clipping two polygons
	 */
	if (subject.length < 3 || clip.length < 3) throw new TypeError();
	
	const normal = Vector.cross(subject[1].subtract(subject[0]), subject[2].subtract(subject[0]));

	let output = [...subject];
	for (let i = 0; i < clip.length; i++) {
		// The clip line passes through a and b
		let a = clip[i];
		let b = clip[(i + 1) % clip.length];

		let input = [...output];
		output = [];

		for (let j = 0; j < input.length; j++) {
			let curr = input[j];
			let next = input[(j + 1) % input.length];

			// Construct the clip plane. This is the plane spanned by the clip line and
			// the subject polygon's normal vector.
			let N = Vector.cross(normal, b.subtract(a));
			let d = Vector.dot(N, a);

			// Determine whether curr and next are inside the polygon with respect to the 
			// clip line.
			// They are inside if they lie on the positive side of the clip plane, or on
			// the plane itself.
			const currInside = Vector.dot(N, curr) - d > -Constants.EPSILON;
			const nextInside = Vector.dot(N, next) - d > -Constants.EPSILON;

			// Case 1: Both curr and next are inside the clip line.
			// Add next to the output list
			if (currInside && nextInside)
				output.push(next);
			// Case 2: curr is inside the clip line, but next is outside. 
			// Add the intersection of AB with the edge from curr to next to the output
			else if (currInside && !nextInside) {
				let isect = lineIntersect(a, b, curr, next);
				output.push(isect);
			// Case 3: curr is outside the cut line, but next is inside.
			// Add the intersection of AB and the edge from curr to next as well as next
			} else if (!currInside && nextInside) {
				let isect = lineIntersect(a, b, curr, next);
				output.push(isect);
				output.push(next);
			}
			// Case 4: Neither curr nor prev are inside the clip line. 
			// Do nothing
		}
	}


	return output;
}