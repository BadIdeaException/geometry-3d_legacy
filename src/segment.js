import VectorFactory from './vector.js';
import MatrixFactory from './matrix.js';
import lineIntersect from './util/line-intersect.js';

const SegmentType = Symbol();

export default EPSILON => {
	const Vector = VectorFactory(EPSILON);
	const Matrix = MatrixFactory(EPSILON);

	class Segment {
		a;
		b;
		static [SegmentType];
		static [Symbol.hasInstance](instance) {
			return SegmentType in Object.getPrototypeOf(instance).constructor;
		}

		constructor(a,b) {
			this.a = a;
			this.b = b;
		}

		direction() {
			return this.b.subtract(this.a);
		}

		equals(other) {
			return (this.a.equals(other.a) && this.b.equals(other.b)) || (this.a.equals(other.b) && this.b.equals(other.a));
		}
		
		/**
		 * Calculates the intersection of this segment with another segment. 
		 * If the segments intersect, returns the intersection point, otherwise returns `null`.
		 * In the special case that the segments are colinear and overlapping, returns a new 
		 * `Segment` for the overlap.
		 * @param  {Segment} other The other segment with which to intersect this segment.
		 * @return {null|Segment|Vector}       `null` if the segments do not intersect, or
		 * a `Vector` of the intersection point, or a `Segment` for the overlap if the segments
		 * are co-linear and overlapping.
		 */	
		intersect(other) {
			/*
				This method uses lineIntersect from 'util.js'. If lineIntersect finds an intersection
				point (or determines the segments are collinear), we just need to make sure that this
				intersection happens within the bounds of both segments.
			 */
			let isect = lineIntersect(this.a, this.b, other.a, other.b, EPSILON);
			if (isect === null) return null;

			// They intersect in a point. Make sure the point is contained
			// in both segments
			if (isect instanceof Vector) {
				let v = isect.subtract(this.a);
				let w = isect.subtract(other.a);
				let s = v.x / this.direction().x;
				let t = w.x / other.direction().x;
				if (s < 0 || s > 1 || t < 0 || t > 1) return null;
				return isect;
			}

			// The lines are collinear. See if they overlap
			let t1 = (other.a.x - this.a.x) / this.direction().x;
			let t2 = (other.b.x - this.a.x) / this.direction().x;

			// To make things easer sort t1 and t2 in ascending order
			if (t2 < t1) { 
				let temp = t1;
				t1 = t2;
				t2 = temp;
			}
			// They overlap if the start or the end point of other lie on this segment,
			// i.e., if at least one of t1,t2 is in the interval [0,1]
			if ((0 <= t1 && t1 <= 1) || (0 <= t2 && t2 <= 1)) {
				// If they do, return the overlapping segment
				return new Segment(
					this.a.add(this.direction().scale(Math.max(0,t1))), 
					this.a.add(this.direction().scale(Math.min(1,t2))));
			} else
				return null;
		}	

		/**
		 * Determines whether this segment and `other` are collinear, that is, if `this` and `other` lie
		 * on the same line.
		 * @param  {Segment} other The other segment to check for collinearity.
		 * @return {null|Object}       If the two segments are not collinear, returns `null`. Otherwise
		 * returns an object `{ t1, t2 }` such that `other.a` equals `this.a + t1 * this.direction` and
		 * `other.b` equals `this.a + t2 * this.direction`.
		 */
		collinear(other) {
			// If this and other are co-linear, there is a number t1 such that
			// other.a = this.a + t1 * this.direction and a number t2 such that
			// other.b = this.a + t2 * this.direction
			let direction = this.direction();
			let t1 = (other.a.x - this.a.x) / direction.x;
			if (other.a.y - this.a.y - t1 * direction.y >= EPSILON || other.a.z - this.a.z - t1 * direction.z >= EPSILON)
				return null;

			let t2 = (other.b.x - this.a.x) / direction.x;
			if (other.b.y - this.a.y - t2 * direction.y >= EPSILON || other.b.z - this.a.z - t2 * direction.z >= EPSILON)
				return null;

			return { t1, t2 };
		}
	}
	return Segment;
}