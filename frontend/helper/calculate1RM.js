export default function calculate1RM(weight, reps) {
    // Brzycki Formula: 1RM = W / (1.0278 - 0.0278 * R)
    return weight / (1.0278 - 0.0278 * reps);
}