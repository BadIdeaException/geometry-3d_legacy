import Vector from './vector.js';
import Segment from './segment.js';
import Matrix from './matrix.js';
import Polygon from './polygon.js';
import Constants from './constants.js';
import { clipPolygon } from './util.js';

function calculateNormal(triangle) {
	// u is the vector from point A to point B of this triangle
	let u = triangle[1].subtract(triangle[0]);
	// v is the vector from point B to point C of this triangle
	let v = triangle[2].subtract(triangle[1]);
	// Return the vector product of u and v.
	// It is orthogonal to both u and v and its length is the
	// area of the parallelogram described by u and v - 
	// i.e., twice the size of the triangle.
	return Vector.cross(u,v);	
}

export default class Triangle extends Polygon {
	constructor(a,b,c) {
		if (!b && !c && Array.isArray(a)) {
			b = a[1];
			c = a[2];
			a = a[0];
		}
		// Make sure the winding is counter-clockwise
		// If the determinant of the three vertices making up the face is < 0, the face is clock-wise
		if (Matrix.fromColumns(a,b,c).determinant() < 0) {
			let temp = b;
			b = c;
			c = temp;
		}		
		
		super(a, b, c);

		this.normal = calculateNormal(this);
	}

	/*
		Calling array functions such as map(), filter() etc. will return an instance of 
		Array, not Triangle.
		This is because many of them work iteratively: map(), for instance, creates a 
		new array and then populates it, but we always need three points for a triangle
		to be created.
		The results of filter(), for example, are most likely to not even be a triangle
		at all, even setting aside its iterative nature.
	 */
	static get [Symbol.species]() { return Array };

	equals(other) {
		return this.length === other.length && this.every(v1 => other.some(v2 => v1.equals(v2)));
	}

	/**
	 * Cuts this triangle along the plane perpendicular to `dimension` at `offset`. This can be thought of as 
	 * returning an array of `Triangle`s corresponding to this `Triangle` such that all resulting triangles' vertices `dimension`
	 * coordinates are either less-than-or-equal or greater-than-or-equal than `offset`, i.e. no resulting triangle
	 * crosses `dimension`.
	 * @param  {String} dimension One of `'x'`, `'y'` or `'z'`.
	 * @param  {Number} offset    The offset at which to cut.
	 * @return {Triangle[]}           An array of triangles making up the results of the cut. The result is ordered
	 * such that triangles on the greater-than-or-equal side of the cut plane come first. This array has an extra property
	 * `crossIndex` that is the index of the first face in the array to be on the less-than-or-equal side of the cut plane.
	 */
	cut(dimension, offset) {
		const otherDimensions = ['x','y','z'].filter(dim => dim !== dimension);

		let result;
		if (this.every(v => v[dimension] >= offset)) {
			// The face is completely on the greater-or-equal side of the cut plane. 
			// Return an array of length 1 containing only this face. Crossindex is 1;
			result = [ this ];
			result.crossIndex = 1;
		} else if (this.every(v => v[dimension] <= offset)) {
			result = [ this ];
			result.crossIndex = 0;			
		} else if (this.some(v => v[dimension] > offset) && this.some(v => v[dimension] < offset)) {
			// The triangle crosses the cut plane. Calculate the intersections p1 and p2 with the cut plane.
			// This means that there is guaranteed to be one vertex on one side of the cut plane, and two
			// vertices on the other. Therefore, cutting will always result in one triangle and one trapezoid. 
			// The trapezoid can then be further subdivided into two triangles along one of its diagonals.

			// The vertices making up what will become the trapezoid after the cut
			let trapezoid = [];
			// The vertices making up what will become the triangle after the cut
			let triangular = [];

			let switched = false;
			// Assign the face's vertices to the trapezoid and triangular lists
			this.forEach(v => v[dimension] >= offset ? trapezoid.push(v) : triangular.push(v));
			if (triangular.length === 2) {
				let temp = triangular;
				triangular = trapezoid;
				trapezoid = temp;
				// Remember we switched trapezoid and triangular list. This is important for ordering the result
				switched = true; 
			}

			// Calculate the two intersection points with the cut plane by determining the ratio by which
			// the intersecting edge's "dimension" coordinate needs to be shortened. The other coordinates
			// then must be shortened by the same ratio (because edges are straight).
			let a0 = (trapezoid[0][dimension] - offset) / (trapezoid[0][dimension] - triangular[0][dimension]);
			let p0 = {
				[dimension]: offset, 
				[otherDimensions[0]]: trapezoid[0][otherDimensions[0]] + (triangular[0][otherDimensions[0]] - trapezoid[0][otherDimensions[0]]) * a0, 
				[otherDimensions[1]]: trapezoid[0][otherDimensions[1]] + (triangular[0][otherDimensions[1]] - trapezoid[0][otherDimensions[1]]) * a0
			};
			p0 = new Vector(p0.x, p0.y, p0.z);

			let a1 = (trapezoid[1][dimension] - offset) / (trapezoid[1][dimension] - triangular[0][dimension]);
			let p1 = {
				[dimension]: offset,
				[otherDimensions[0]]: trapezoid[1][otherDimensions[0]] + (triangular[0][otherDimensions[0]] - trapezoid[1][otherDimensions[0]]) * a1,
				[otherDimensions[1]]: trapezoid[1][otherDimensions[1]] + (triangular[0][otherDimensions[1]] - trapezoid[1][otherDimensions[1]]) * a1
			}
			p1 = new Vector(p1.x, p1.y, p1.z);

			triangular = [
				new Triangle(triangular[0], p0, p1)
			];
			trapezoid = [
				new Triangle(trapezoid[0], trapezoid[1], p1),
				new Triangle(p1, p0, trapezoid[0])
			];
			if (switched) { 
				result = triangular.concat(trapezoid);
				result.crossIndex = triangular.length;
			} else {
				result = trapezoid.concat(triangular);
				result.crossIndex = trapezoid.length;
			}
		}
		return result;
	}

	/**
	 * Checks whether `point` is inside the boundaries of this triangle.
	 * @param  {Vector} point The point to check.
	 * @return {boolean}       `true` if and only if `point` lies inside this triangle.
	 */
	contains(point) {
		/*
			This method implements a common method based on cross products. 
			It follows from the principle that a point P is inside a triangle ABC if and only if
			the sum of the areas of the triangles PAB, PAC and PBC equal the area of ABC.
			
			See https://math.stackexchange.com/questions/2582202/does-a-3d-point-lie-on-a-triangular-plane
		 */
		// Check that the point is on this triangle's plane, that is that
		// N * P + d = 0
		const N = this.normal.scale(1/this.normal.length);
		const d = -Vector.dot(N, this[0]);
		if (Vector.dot(N, point) + d > Constants.EPSILON) return false;

		// "Move" this triangle so that the point to check is (0,0,0)
		let a = this[0].subtract(point);
		let b = this[1].subtract(point);
		let c = this[2].subtract(point);

		// Compute the normal vectors for sub-triangles PBC, PCA, PAB
		let u = Vector.cross(b, c);
		let v = Vector.cross(c, a);
		let w = Vector.cross(a, b);

		// Normal vectors' length corresponds to the area of the parallelogram formed by the vectors.
		// So we need to check that
		// 1/2 * this.normal.length = 1/2 (u.length + v.length + w.length)
		// which we simplify to
		// this.normal.length = u.length + v.length + w.length
				
		return Math.abs(this.normal.length - u.length - v.length - w.length) < Constants.EPSILON;
	}

	intersect(other) {
		/*
			Triangle-triangle intersection test with the algorithm presented by Tomas Möller 1997
			https://web.stanford.edu/class/cs277/resources/papers/Moller1997b.pdf
		 */
		
		// Helper function that returns the intersection point of the three planes
		// N1 * X + d1 = 0, N2 * X + d2 = 0, N3 * X = 0
		function intersectThreePlanes(N1, d1, N2, d2, N3 /* d3 === 0 */) {
			/*		
				This function is based on "Intersection of Three Planes", Ron Goldman as seen in
				Andrew Glassner, "Graphics Gems", p. 305. 
				See also this StackOverflow answer:
				https://stackoverflow.com/a/18092154/3315731
				
				The intersection of three planes pi1, pi2, pi3 can then be calculated as 
						O = ((P1 * N1)(N2 x N3) + (P2 * N2)(N3 x N1) + (P3 * N3)(N1 x N2)) / det(N1 N2 N3)
				where each P{1,2,3} is a point on pi{1,2,3} and the normal vectors are of unit length.
				Because P1 * N1 = -d1, we can simplify this to
						O = (-d1 * (N2 x N3) - d2 * (N3 x N1) - d3 * (N1 x N2)) / det(N1 N2 N3)
						  = (-d1 * (N2 x N3) - d2 * (N3 x N1) - 0 * (N1 x N2)) / det(N1 N2 N3)
			 */
			// The above requires that N1, N2, N3  are of unit length, so first we need to normalize them.
			// This also means dividing d1 and d2 by N1 and N2, resp.:
			// d1 /= N1.length;
			// d2 /= N2.length;
			// N1 = N1.scale(1 / N1.length);
			// N2 = N2.scale(1 / N2.length);
			// N3 = N3.scale(1 / N3.length);			
			let det = Matrix.fromColumns(N1, N2, N3).determinant();
			// Ordinarily, we would need to check that det !== 0. But we already know that pi1 and pi2 intersect,
			// and have specifically constructed pi3 in a way that it intersects, too, so we can skip that
			// step here.
			let O = Vector.cross(N2, N3).scale(-d1);
			O = O.add(Vector.cross(N3, N1).scale(-d2));
			O = O.scale(1 / det);
			return O;
		}
		// Helper function that works like Math.sign, but returns 0 if |x| < EPSILON rather than x === 0
		const sign = x => Math.abs(x) < Constants.EPSILON ? 0 : Math.sign(x);

		// Let pi2 be the plane in which the other triangle lies and pi1 be the plane in which this triangle lies
		// Calculate the parameters of p2's plane equation pi2: N2 * X + d2 = 0
		const N2 = Vector.cross(other[1].subtract(other[0]), other[2].subtract(other[0]));
		const d2 = -Vector.dot(N2, other[0]);

		// Calculate the signed distances of this triangle's vertices from the other triangle's plane
		const dist1 = this.map(v => Vector.dot(N2, v) + d2);
		// If all distances are unequal to 0, and all have the same sign, then this triangle lies completely on one 
		// side of pi2 and there is no overlap.
		if (Math.abs(dist1[0]) > Constants.EPSILON && Math.abs(dist1[1]) > Constants.EPSILON && Math.abs(dist1[2]) > Constants.EPSILON 
			&& Math.sign(dist1[0]) === Math.sign(dist1[1]) && Math.sign(dist1[0]) === Math.sign(dist1[2])) {
			return null;
		}

		// Do the same with roles reversed
		const N1 = Vector.cross(this[1].subtract(this[0]), this[2].subtract(this[0]));
		const d1 = -Vector.dot(N1, this[0]);
		const dist2 = other.map(v => Vector.dot(N1, v) + d1);
		if (Math.abs(dist2[0]) > Constants.EPSILON && Math.abs(dist2[1]) > Constants.EPSILON && Math.abs(dist2[2]) > Constants.EPSILON
			&& Math.sign(dist2[0]) === Math.sign(dist2[1]) && Math.sign(dist2[0]) === Math.sign(dist2[2])) {
			return null;
		}

		// If all dist{0,1}.{0,1,2} === 0 the two planes are co-planar.
		if (dist1[0] < Constants.EPSILON && dist1[1] < Constants.EPSILON && dist1[2] < Constants.EPSILON
			&& dist2[0] < Constants.EPSILON && dist2[1] < Constants.EPSILON && dist2[2] < Constants.EPSILON) {
			// The original paper now projects the two triangles to an axis-aligned plane for optimization, and
			// then conducts pair-wise edge intersections. 
			// 
			// However, we are not interested in just IF the triangles intersect, but in their actual intersection
			// shape. Therefore, we will use the Sutherland-Hodgman algorithm from util.js, remove the duplicate
			// last point if necessary, and construct a result object based on the length of the result.
			let result = clipPolygon(this, other);

			switch (result.length) {
				case 0: return null;
				case 1: return result[0];
				case 2: return new Segment(...result);
				case 3: return new Triangle(...result);
				default: return new Polygon(...result);
			}

			// let result = [];
			// // Do a pairwise intersection test on both faces
			// for (let edge of this.edges) 
			// 	for (let otherEdge of other.edges) {
			// 		let isect = edge.intersect(otherEdge);
			// 		// The triangles might share an edge, in which case edge.intersect returns a segment
			// 		// Split this into its two endpoints, because result needs to be an array of points.
			// 		if (isect instanceof Segment) {
			// 			result.push(isect.a);
			// 			result.push(isect.b);
			// 		} else if (isect instanceof Vector)
			// 			// Intersection was a point, push it into the intersections array
			// 			result.push(isect);
			// 	}

			// if (result.length === 0) {
			// 	// No edges intersected. But it could still be that one triangle is completely contained in the other.
			// 	// For this, it's enough to check for if one vertex of this triangle is contained in the other triangle, and
			// 	// vice versa.
			// 	if (this.contains(other[0]))
			// 		// If this triangle contains one vertex of the other triangle, it contains all of them (because there 
			// 		// are no edge intersections).
			// 		// Hence, the intersection of the two triangles is the contained triangle.
			// 		return other;
			// 	else if (other.contains(this[0]))
			// 		// Analagous to the above
			// 		return this;
			// 	else 
			// 		// There are no edge intersections and none of the triangles completely contains the other.
			// 		// The triangles do not intersect.
			// 		return null;
			// } else
			// 	return result;
		}

		// So now we know that the two triangles intersect in a line L: O + tD
		const D = Vector.cross(N1, N2).unit();

		// Note that according to the original paper, section 2.1 Optimizations, we wouldn't actually need to compute O.
		// But since we are interested not just in a yes-or-no answer but in the actual intersection points/segment, we 
		// do need to compute and use it.
		//
		// A point on the intersection line can be found by intersecting the two planes with a further one. We could use
		// one of the coordinate planes x=0, y=0 or z=0 for this, but would have to check that the intersection line is
		// not by chance parallel to it. So instead, we use the plane (N1 x N2) * X + 0 = D * X = 0: 
		// The plane that is perpendicular to pi1 and pi2 and (arbitrarily) contains the origin.
		const O = intersectThreePlanes(N1, d1, N2, d2, D);

		// Project vertices onto L
		const proj1 = this.map(v => Vector.dot(D, v.subtract(O)));

		// We know that two of the projected vertices of this triangle lie on one side of L and one on the other 
		// (if this wasn't the case, we would have rejected it further up). 
		// Compute t1 and t2 as the intersection with L of the lines that are formed by each of the 
		// two projected vertices on the same side with the remaining projected vertex on the other side
		let paired11; let paired12; let lone1;
		if (sign(dist1[0]) === sign(dist1[1])) {
			// If the signed distances of this triangle's A and B points have the same sign, they lie on the same side,
			// and c is the lone vertex on the other.
			paired11 = 0; paired12 = 1; lone1 = 2;
		} else if (sign(dist1[0]) === sign(dist1[2])) {
			paired11 = 0; paired12 = 2; lone1 = 1;
		} else if (sign(dist1[1]) === sign(dist1[2])) {
			paired11 = 1; paired12 = 2; lone1 = 0;
		} else {
			// In this situation, two vertices lie to either side of L while one lies on it
			// If A is on the line, arbitrarily choose it and B to be on the same side
			if (dist1[0] === 0) {
				paired11 = 0; paired12 = 1; lone1 = 2;
			} else {
				// Otherwise, either B or C must be on the line, so choose them to be paired and A to be lone
				paired11 = 1; paired12 = 2; lone1 = 0;
			}
		}
		// interval1 is the overlap of this face with L
		let interval1 = [
			proj1[paired11] + (proj1[lone1] - proj1[paired11]) * dist1[paired11] / (dist1[paired11] - dist1[lone1]),
			proj1[paired12] + (proj1[lone1] - proj1[paired12]) * dist1[paired12] / (dist1[paired12] - dist1[lone1])
		];

		// Do the same thing for the other face
		// Project vertices onto L
		const proj2 = other.map(v => Vector.dot(D, v.subtract(O)));
		// We know that two of the projected vertices of this face lie on one side of L and one on the other 
		// (if this wasn't the case, we would have rejected it further up). 
		// Compute t1 and t2 as the intersection with L of the lines that are formed by each of the 
		// two projected vertices on the same side with the remaining projected vertex on the other side
		let paired21; let paired22; let lone2;
		if (sign(dist2[0]) === sign(dist2[1])) {
			// If the signed distances of the other triangle's A and B points have the same sign, they lie on the same side,
			// and c is the lone vertex on the other.
			paired21 = 0; paired22 = 1; lone2 = 2;
		} else if (sign(dist2[0]) === sign(dist2[2])) {
			paired21 = 0; paired22 = 2; lone2 = 1;
		} else if (sign(dist2[1]) === sign(dist2[2])) {
			paired21 = 1; paired22 = 2; lone2 = 0;
		} else {
			if (dist2[0] === 0) {
				paired21 = 0; paired22 = 1; lone2 = 2;
			} else {
				paired21 = 1; paired22 = 2; lone2 = 0;
			}
		}
		// interval2 is the overlap of the other face face with L
		let interval2 = [
			proj2[paired21] + (proj2[lone2] - proj2[paired21]) * dist2[paired21] / (dist2[paired21] - dist2[lone2]),
			proj2[paired22] + (proj2[lone2] - proj2[paired22]) * dist2[paired22] / (dist2[paired22] - dist2[lone2])
		];

		// Check if the intervals overlap
		// For ease of comparison, sort them, since this makes no difference for their overlap
		interval1.sort();
		interval2.sort();

		let overlap = [
			Math.max(interval1[0], interval2[0]),
			Math.min(interval1[1], interval2[1])
		];
		if (overlap[1] - overlap[0] > Constants.EPSILON) {
			// The two faces "truly" intersect, i.e. penetrate through each other at an angle. Their intersection is a 
			// line segment.
			// Return this line segment.
			return new Segment(O.add(D.scale(overlap[0])), O.add(D.scale(overlap[1])));
		} else if (overlap[0] - overlap[1] < Constants.EPSILON) {
			// The two faces only share a single point. 
			// Return it.
			return O.add(D.scale(overlap[0]));
		} else
			return null;
	}

	getBoundingBox() {
		let X = this.map(v => v.x);
		let Y = this.map(v => v.y);
		let Z = this.map(v => v.z);
		return {
			xmin: Math.min(...X),
			xmax: Math.max(...X),
			ymin: Math.min(...Y),
			ymax: Math.max(...Y),
			zmin: Math.min(...Z),
			zmax: Math.max(...Z)
		}
	}

	get edges() {
		return [
			new Segment(this[0], this[1]),
			new Segment(this[1], this[2]),
			new Segment(this[2], this[0])
		]
	}
}