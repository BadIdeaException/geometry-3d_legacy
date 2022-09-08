export default () => class Matrix extends Array {
	constructor(m11, m12, m13, m21, m22, m23, m31, m32, m33) {
		super(9);
		this[0] = m11;
		this[1] = m12;
		this[2] = m13;
		this[3] = m21;
		this[4] = m22;
		this[5] = m23;
		this[6] = m31;
		this[7] = m32;
		this[8] = m33;
	}

	determinant() {
		return this[0] * this[4] * this[8] 
			+ this[1] * this[5] * this[6]
			+ this[2] * this[3] * this[7]
			- this[2] * this[4] * this[6]
			- this[1] * this[3] * this[8]
			- this[0] * this[5] * this[7];
	}

	static fromColumns(c1, c2, c3) {
		return new Matrix(
			c1.x, c2.x, c3.x,
			c1.y, c2.y, c3.y,
			c1.z, c2.z, c3.z
		);
	}
}