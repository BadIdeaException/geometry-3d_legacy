import VectorFactory from './vector.js';
import TriangleFactory from './triangle.js';
import PolygonFactory from './polygon.js';

const MeshType = Symbol();

export default EPSILON => {
	const Vector = VectorFactory(EPSILON);
	const Triangle = TriangleFactory(EPSILON);
	const Polygon = PolygonFactory(EPSILON);

	class Mesh extends Array {
		static [MeshType];
		static [Symbol.hasInstance](instance) {
			return MeshType in Object.getPrototypeOf(instance).constructor;
		}

		constructor(faces) {
			if (Array.isArray(faces) && !(faces instanceof Triangle) && !(faces instanceof Polygon)) {
				super(faces.length);
				Object.assign(this, faces);
			} else {
				super(arguments.length);
				Object.assign(this, arguments);
			}
		}
		/*
			Applying Array operations to a mesh will yield an array, not a mesh
		 */
		static get [Symbol.species]() { return Array }

		/**
		 * Cuts this mesh along the plane perpendicular to `dimension` at `offset`.
		 * @param  {String} dimension One of `'x'`, `'y'` or `'z'`.
		 * @param  {Number} offset    The offset at which to cut.
		 * @return {Object}		An object of two meshes (`above` and `below`) that combined equal this mesh, but do
		 * not intersect with the cut plane (other than touching). Note that the meshes are not guaranteed
		 * to be contiguous even if the original mesh was. The `above` mesh is comprised of all
		 * faces on the greater-or-equal side of the cutplane, the `below` mesh that with the less-than-or-equal ones.
		 * Note that `above` or `below` may be empty meshes.
		 */
		cut(dimension, offset) {
			let above = [];
			let below = [];
			let cutResults = this.map(face => face.cut(dimension, offset));
				
			for (let cutResult of cutResults) {
				above = above.concat(cutResult.above.isEmpty() ? [] : cutResult.above.tesselate());
				below = below.concat(cutResult.below.isEmpty() ? [] : cutResult.below.tesselate());
			}
			return {
				above: new Mesh(above),
				below: new Mesh(below)
			};
		}

		/**
		 * Checks this mesh for intersection with the ray. The ray intersects the mesh if it intersects at least
		 * one face of the mesh.
		 * @param  {Object} ray [description]
		 * @return {boolean}     `true` if `ray` intersects with this mesh, `false` otherwise.
		 */
		rayIntersect(ray) {
			this.some(face => face.rayIntersect(ray));
		}

		/**
		 * Splits this mesh into contiguous sub meshes.
		 * @return {Mesh[]} An array of contiguous meshes that combined equal this mesh.
		 */
		split() {
			/* 
				This algorithm works somewhat like a flood fill.
				It starts by selecting an arbitrary face of the mesh, and then consecutively
				adding all other faces that share at least one vertex with an already selected face.

				When no such faces exist any more, but not all faces of the mesh are accounted for,
				it creates a new submesh and repeats the algorithm, starting with one of the remaining
				faces.

				It does this until all faces of the original mesh have been assigned to submeshes.
			 */
			
			// The faces of the original mesh that are not yet assigned to a submesh
			let remaining = this.slice(); // Shallow copy
			// The faces that were selected in the previous step
			let selected = [];
			// The resulting array of submeshes
			const result = [];
			// The current submesh
			let current;
			while (remaining.length > 0) {
				// If no pieces are currently selected, we have found a new submesh.
				if (selected.length === 0) {
					// Start a new submesh
					current = [];
					// Add it to the result
					result.push(current);
					// Select an arbitrary unprocessed face to start the algorithm. We just take the first.
					selected = [ remaining[0] ];
				}
				// Add the selected faces to the current submesh
				current.splice(current.length, 0 , ...selected);
				// Remove the selected faces from those that are still in need of processing
				remaining = remaining.filter(face => !selected.includes(face));
				// From the remaining unprocessed faces, select those share at least one vertex with some 
				// face selected in the last step.
				selected = remaining.filter(
					remainingFace => selected.some(selectedFace => 
						remainingFace.some(vr => 
						selectedFace.some(vs => vr.equals(vs)))
					)
				);
			}

			return result.map(submesh => new Mesh(submesh));
		}

		/**
		 * Whether or not this mesh is contiguous. 
		 * 
		 * A mesh is contiguous if for any two vertices v1 and v2 of the mesh, there is a sequence of edges
		 * connecting v1 and v2.
		 * @return {Boolean} `true` if this mesh is contiguous, `false` otherwise.
		 */
		isContiguous() {
			return this.split().length > 1;
		}

		/**
		 * Whether or not this mesh is empty. A mesh is empty if it contains no faces.
		 * @return {Boolean} `true` iff this mesh is empty.
		 */
		isEmpty() {
			return this.length === 0;
		}

		get vertices() {
			return this.flat();
		}

		getBoundingBox() {
			let result = {};
			['x','y','z'].forEach(dim => result[`${dim}min`] = Number.POSITIVE_INFINITY);
			['x','y','z'].forEach(dim => result[`${dim}max`] = Number.NEGATIVE_INFINITY);
			for (let v of this.vertices) {
				for (let dim of ['x','y','z']) {
					if (v[dim] > result[`${dim}max`]) result[`${dim}max`] = v[dim];
					if (v[dim] < result[`${dim}min`]) result[`${dim}min`] = v[dim];
				}
			}
			return result;
		}

	}
	return Mesh;
}