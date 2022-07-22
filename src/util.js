import Vector from './vector.js';
import Matrix from './matrix.js';
import Constants from './constants.js';

export function sign(x) { return Math.abs(x) < Constants.EPSILON ? 0 : Math.sign(x) };

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
 * 
 * 	1. be co-planar (this also implies that both need to be planar), 
 *  2. be convex,
 *  3. be wound counter-clockwise,
 *  4. contain at least three points. 
 * 
 * Note that for performance reasons, the first three preconditions are not checked by this function. 
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

			// Construct the clip plane from the clip line. 
			// This is the plane spanned by the clip line and the subject polygon's normal vector.
			let N = Vector.cross(normal, b.subtract(a));
			let d = Vector.dot(N, a);

			// Calculate the sign of the signed distances of curr and next to the clip plane.
			// They will be kept if they are on the positive side of the clip plane,
			// or on the plane itself.
			const currSide = sign(Vector.dot(N, curr) - d);
			const nextSide = sign(Vector.dot(N, next) - d);

			// Case 1: Both curr and next are on the "keep" side of the clip plane, 
			// or on the plane itself.
			// Add next to the output list
			if (currSide >= 0 && nextSide >= 0)
				output.push(next);
			// Case 2a: curr is on the "keep" side of the clip plane, but next is on 
			// the "discard" side. 
			// Add the intersection of AB with the edge from curr to next to the output.
			// (Note that curr was already added in the previous step.)
			else if (currSide > 0 && nextSide < 0) {
				let isect = lineIntersect(a, b, curr, next);
				output.push(isect);
			// Case 2b: curr is on the clip plane, but next is on the "discard" side.
			// Then the intersection of AB with the edge from curr to next is curr.
			// Do nothing, because curr was already added in the previous step.
			} else if (currSide === 0 && nextSide < 0) {
				
			// Case 3a: curr is on the "discard" side of the clip plane, but next is on the
			// "keep" side.
			// Add the intersection of AB and the edge from curr to next as well as next
			} else if (currSide < 0 && nextSide > 0) {
				let isect = lineIntersect(a, b, curr, next);
				output.push(isect);
				output.push(next);
			// Case 3b: curr is on the "discard" side of the clip plane, but next is on it.
			// Then the intersection of AB and the edge from curr to next is next.
			// Add next to the output.
			} else if (currSide < 0 && nextSide === 0) {
				output.push(next);
			}
			// Case 4: Both curr and prev are on the "discard" side of the clip plane. 
			// Add neither, i.e. do nothing.
		}
	}

	return output;
}