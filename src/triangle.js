import VectorFactory from './vector.js';
import SegmentFactory from './segment.js';
import MatrixFactory from './matrix.js';
import PolygonFactory from './polygon.js';

const TriangleType = Symbol();

/**
 * A special `Polygon` with three vertices. This is the main building block of meshes.
 *
 * Triangles are always wound counter-clockwise. 
 *
 * `Triangle` inherits (indirectly) from `Array`, so array methods such as `map`, `filter`, etc. can be 
 * applied to the triangle's vertices. It is important to not that such operations will return an `Array`,
 * not a `Triangle`.
 */
export default EPSILON => {
	const Vector = VectorFactory(EPSILON);
	const Segment = SegmentFactory(EPSILON);
	const Matrix = MatrixFactory(EPSILON);
	const Polygon = PolygonFactory(EPSILON);

	class Triangle extends Polygon {
		static [TriangleType];
		static [Symbol.hasInstance](instance) {
			return TriangleType in Object.getPrototypeOf(instance).constructor;
		}
		
		/**
		 * Creates a new `Triangle` from the passed points. If the points are not passed in an order that produces
		 * a counter-clockwise winding, they will be re-ordered.
		 * @param  {Vector[]|Vector} a Either one of the vertices of the triangle, or an array of
		 * all three vertices.
		 * @param  {Vector} b The second vertex of the triangle. If `a` is an array, this parameter is ignored.
		 * @param  {Vector} c The third vertex of the triangle. If `a` is an array, this parameter is ignored.
		 */
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
		}

		get normal() {
			// u is the vector from point A to point B of this triangle
			let u = this[1].subtract(this[0]);
			// v is the vector from point B to point C of this triangle
			let v = this[2].subtract(this[1]);
			// Return the vector product of u and v.
			// It is orthogonal to both u and v and its length is the
			// area of the parallelogram described by u and v - 
			// i.e., twice the size of the triangle.
			return Vector.cross(u, v);	
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
		static get [Symbol.species]() { return Array }

		/**
		 * Whether this triangle equals `other`. Two triangles are considered equal if they have the
		 * same set of vertices. More specifically, this method returns `true` if `other` is of length
		 * 3 and for every vertex of this triangle, there is a vertex in `other` such that the two vertices
		 * are equal (as determined by `Vector.equals()`). 
		 *
		 * This means that `other` does not necessarily need to be a `Triangle`. It may be a `Polygon` or simply
		 * an array of vertices.
		 * @param  {Vector[]} other The other shape to check. This will usually be a `Triangle`.
		 * @return {boolean}       `true` if the other shape is equal to this triangle, `false` otherwise.
		 */
		equals(other) {
			return other.length === 3 && this.every(v1 => other.some(v2 => v1.equals(v2)));
		}

		/**
		 * Cuts this triangle along the plane perpendicular to `dimension` at `offset`. The result is an object containing
		 * a polygon for all vertices above-or-on the cut plane and below-or-on the cut plane, respectively. For edges crossing
		 * the cut plane, the edge's intersection point with the cut plane is added. 
		 *
		 * If the triangle does not intersect with the cut plane, one of `above` or `below` will be an empty polygon.
		 * If the triangle is co-planar with the cut plane, it will be returned in both `above` and `below`.
		 * @param  {String} dimension One of `'x'`, `'y'` or `'z'`.
		 * @param  {Number} offset    The offset at which to cut.
		 * @return {Object}           An object containing two `Polygon`s making up the results of the cut: those
		 * one the greater-than-or-equal side of the cut plane (`above`), and those on the less-than-or-equal side (`below`). 
		 */
		cut(normal, offset) {
			// Helper function that calculates the intersection point of the line given by P1 and P2 with the
			// plane given by normal and offset
			// It is assumed that the line is not parallel to the plane
			function linePlaneIntersect(normal, offset, P1, P2) {
				let a = (offset - Vector.dot(normal, P1)) / (Vector.dot(normal, P2) - Vector.dot(normal, P1));
				return P1.add(P2.subtract(P1).scale(a));
			}

			// Calculate the signed distances of this triangle from the cut plane
			const distances = this.map(vertex => Vector.dot(normal, vertex) - offset);
			if (distances.every(d => Math.abs(d) < EPSILON)) {
				// The triangle is co-planar with the cut plane. 
				// Assign it to both above and below.
				return { above: this, below: this };
			} else if (distances.every(d => d > -EPSILON)) {
				// The triangle is completely on the greater-or-equal side of the cut plane. 
				// Assign it to above and an empty polygon to below.
				return { above: this, below: new Polygon() };				
			} else if (distances.every(d => d < EPSILON)) {
				// The triangle is completely on the less-than-or-equal side of the cut plane.
				// Assign it to below and an empty polygon to above.
				return { above: new Polygon(), below: this };				
			} else if (distances.some(d => d > -EPSILON) && distances.some(d => d < EPSILON)) {
				// The triangle crosses the cut plane. 

				// Initialize the lists that will hold vertices above and below the cut plane, resp.
				// Initialize the variable for a vertex that is right on the cut plane.
				let above = [];
				let below = [];
				let on = null;
				distances.forEach((d, index) => {
					if (Math.abs(d) < EPSILON)
						on = this[index];
					else if (d > EPSILON)
						above.push(this[index]);
					else 
						below.push(this[index]);
				});

				if (on) {
					// If one vertex is right on the cut plane, above and below will each contain one remaining vertex each.
					// The edge between them crosses the cut plane. Calculate this edge's intersection point with the cut
					// plane. 
					// Above and below are each triangles.
					let P = linePlaneIntersect(normal, offset, below[0], above[0]);
					return {
						above: new Triangle(above[0], P, on),
						below: new Triangle(P, below[0], on)
					};					
				} else {
					// At this point we know none of the vertices are directly on the cut plane. This means there is one
					// vertex on the one side and two on the other. 
					// Therefore, cutting will result in one triangle and one trapezoid. 
					// 
					// Calculate the two intersection points with the cut plane.
					const triangular = above.length === 1 ? above : below;
					const trapezoidal = above.length === 2 ? above : below;

					let intersections = trapezoidal.map(vertex => linePlaneIntersect(normal, offset, vertex, triangular[0])).reverse();
					above = above.concat(intersections);
					below = below.concat(intersections);
					return {
						above: new (above.length > 3 ? Polygon : Triangle)(above),
						below: new (below.length > 3 ? Polygon : Triangle)(below)
					}
				}
			}
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
			if (Vector.dot(N, point) + d > EPSILON) return false;

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
					
			return Math.abs(this.normal.length - u.length - v.length - w.length) < EPSILON;
		}

		/**
		 * Intersects this triangle with the other triangle and returns the intersection shape. This may be
		 *
		 * - `null`, if the two triangles do not intersect,
		 * - a `Segment` if the two triangles jut through each other,
		 * - a `Polygon` if the two triangles are co-planar and overlapping.
		 * 
		 * @param  {Vector[]} other The other triangle with which to intersect. This may be a `Triangle`, but
		 * must at least be an array containing three vertices.
		 * @return {Vector|Segment|Triangle|Polygon|null}       The intersection shape of the two triangles.
		 */
		intersect(other) {
			if (other.length !== 3) throw new TypeError(`Triangles can only be intersected with other triangles`);

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
			const sign = x => Math.abs(x) < EPSILON ? 0 : Math.sign(x);

			// Let pi2 be the plane in which the other triangle lies and pi1 be the plane in which this triangle lies
			// Calculate the parameters of p2's plane equation pi2: N2 * X + d2 = 0
			const N2 = Vector.cross(other[1].subtract(other[0]), other[2].subtract(other[0]));
			const d2 = -Vector.dot(N2, other[0]);

			// Calculate the signed distances of this triangle's vertices from the other triangle's plane
			const dist1 = this.map(v => Vector.dot(N2, v) + d2);
			// If all distances are unequal to 0, and all have the same sign, then this triangle lies completely on one 
			// side of pi2 and there is no overlap.
			if (dist1.every(d => Math.abs(d) > EPSILON) && Math.sign(dist1[0]) === Math.sign(dist1[1]) && Math.sign(dist1[0]) === Math.sign(dist1[2])) {
				return null;
			}

			// Do the same with roles reversed
			const N1 = Vector.cross(this[1].subtract(this[0]), this[2].subtract(this[0]));
			const d1 = -Vector.dot(N1, this[0]);
			const dist2 = other.map(v => Vector.dot(N1, v) + d1);
			if (dist2.every(d => Math.abs(d) > EPSILON) && Math.sign(dist2[0]) === Math.sign(dist2[1]) && Math.sign(dist2[0]) === Math.sign(dist2[2])) {			
				return null;
			}

			// If all dist{0,1}.{0,1,2} === 0 the two planes are co-planar.
			if (dist1.every(d => Math.abs(d) < EPSILON) && dist2.every(d => Math.abs(d) < EPSILON)) {
				// The original paper now projects the two triangles to an axis-aligned plane for optimization, and
				// then conducts pair-wise edge intersections. 
				// 
				// However, we are not interested in just IF the triangles intersect, but in their actual intersection
				// shape. Therefore, we will conduct the inherited polygon intersection (since we already know, at this 
				// point, that the two triangles are co-planar), and construct a result object based on the length of the result.
				let result = super.intersect(other);

				// If the intersection result was not empty, flatten it from a "set of result polygons" to "a result polygon".
				// Intersection of two convex polygons can never have more than one result component, so doing this is safe.
				if (result.length > 0) 
					result = result[0];

				switch (result.length) {
					case 0: return null;
					case 3: return new Triangle(...result);
					default: return new Polygon(...result);
				}
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
			if (overlap[1] - overlap[0] > EPSILON) {
				// The two faces "truly" intersect, i.e. penetrate through each other at an angle. Their intersection is a 
				// line segment.
				// Return this line segment.
				return new Segment(O.add(D.scale(overlap[0])), O.add(D.scale(overlap[1])));
			} else if (overlap[0] - overlap[1] < EPSILON) {
				// The two faces only share a single point. 
				// Return it.
				return O.add(D.scale(overlap[0]));
			} else
				return null;
		}

		/**
		 * Returns a bounding box for this triangle. 
		 * @return {[type]} [description]
		 */
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

		/**
		 * The edges of this triangle. They are ordered such that
		 * - the first edge connects the first and second vertex,
		 * - the second edge connects the second and third vertex,
		 * - the third edge connects the third and first vertex.
		 * @return {Segment[]} An array of three `Segment`s representing the edges of this triangle.
		 */
		get edges() {
			return [
				new Segment(this[0], this[1]),
				new Segment(this[1], this[2]),
				new Segment(this[2], this[0])
			]
		}

		// Override some Polygon methods with simplified, faster versions specific to Triangle.
		
		/*
			Triangles are always planar and convex.
		 */
		isPlanar() { return true; }
		isConvex() { return true; }
		/*
			Triangles can be tesselated trivially.
		 */
		tesselate() { return [ this ]; }
	}
	return Triangle;
}