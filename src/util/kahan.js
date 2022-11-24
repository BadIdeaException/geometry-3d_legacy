export default function kahan(input) {
	if (arguments.length > 1)
		input = Array.from(arguments);

	let sum = 0.0                    // Prepare the accumulator.
    let c = 0.0                      // A running compensation for lost low-order bits.

    for (let i = 0; i < input.length; i++) {     // The array input has elements indexed input[1] to input[input.length].
        let y = input[i] - c         // c is zero the first time around.
        let t = sum + y              // Alas, sum is big, y small, so low-order digits of y are lost.
        c = (t - sum) - y            // (t - sum) cancels the high-order part of y; subtracting y recovers negative (low part of y)
        sum = t                      // Algebraically, c should always be zero. Beware overly-aggressive optimizing compilers!
    }                           // Next time around, the lost low part will be added to y in a fresh attempt.

    return sum
}