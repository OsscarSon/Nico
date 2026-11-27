#include <array>
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <optional>

// Single-owner, fixed-capacity queue. Calling push/pop from concurrent tasks
// or an ISR requires synchronization specific to the target platform.
template <std::size_t Capacity>
class Mailbox {
    static_assert(Capacity > 0);
    std::array<std::uint16_t, Capacity> samples_{};
    std::size_t read_ = 0;
    std::size_t write_ = 0;
    std::size_t used_ = 0;

public:
    bool push(std::uint16_t sample) {
        if (used_ == Capacity) return false;
        samples_[write_] = sample;
        write_ = (write_ + 1) % Capacity;
        ++used_;
        return true;
    }

    std::optional<std::uint16_t> pop() {
        if (used_ == 0) return std::nullopt;
        const auto sample = samples_[read_];
        read_ = (read_ + 1) % Capacity;
        --used_;
        return sample;
    }
};

int main() {
    Mailbox<3> queue;
    assert(!queue.pop());
    assert(queue.push(4));
    assert(queue.push(6));
    assert(queue.push(0));
    assert(!queue.push(5));
    assert(queue.pop() == 4);
    assert(queue.push(5));
    assert(queue.pop() == 6);
    assert(queue.pop() == 0);
    assert(queue.pop() == 5);
    assert(!queue.pop());
}
