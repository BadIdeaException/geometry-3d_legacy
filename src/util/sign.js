import Constants from '../constants.js';

export default function sign(x) { return Math.abs(x) < Constants.EPSILON ? 0 : Math.sign(x) };
