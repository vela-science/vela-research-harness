#include <algorithm>
#include <charconv>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

namespace {

constexpr std::size_t kBaselineSize = 7192;
constexpr std::size_t kMaximumSize = 8000;
constexpr std::size_t kMaximumBytes = 1U << 20;

[[noreturn]] void fail(const std::string& message) {
  std::cerr << "sidon verifier: " << message << '\n';
  std::exit(1);
}

std::string read_bounded(const char* path) {
  std::ifstream input(path, std::ios::binary);
  if (!input) fail("cannot open candidate artifact");
  input.seekg(0, std::ios::end);
  const std::streamoff length = input.tellg();
  if (length < 0 || static_cast<std::uint64_t>(length) > kMaximumBytes) {
    fail("candidate artifact exceeds the one-megabyte bound");
  }
  input.seekg(0, std::ios::beg);
  std::string bytes(static_cast<std::size_t>(length), '\0');
  if (!bytes.empty() && !input.read(bytes.data(), length)) fail("cannot read candidate artifact");
  return bytes;
}

std::vector<std::string_view> exact_lines(const std::string& bytes) {
  if (bytes.empty() || bytes.back() != '\n') fail("candidate must end with exactly one newline");
  if (bytes.size() >= 2 && bytes[bytes.size() - 2] == '\n') {
    fail("candidate must not contain a trailing blank line");
  }
  if (bytes.find('\r') != std::string::npos) fail("candidate must use LF line endings");
  std::vector<std::string_view> lines;
  std::size_t start = 0;
  while (start < bytes.size()) {
    const std::size_t end = bytes.find('\n', start);
    lines.emplace_back(bytes.data() + start, end - start);
    start = end + 1;
  }
  if (lines.size() != 6) fail("candidate must contain exactly six lines");
  return lines;
}

std::string_view value_after(std::string_view line, std::string_view prefix) {
  if (!line.starts_with(prefix)) fail("candidate field order or name is invalid");
  const std::string_view value = line.substr(prefix.size());
  if (value.empty()) fail("candidate field must not be empty");
  return value;
}

std::size_t parse_size(std::string_view text) {
  std::size_t value = 0;
  const auto [end, error] = std::from_chars(text.data(), text.data() + text.size(), value);
  if (error != std::errc{} || end != text.data() + text.size() || std::to_string(value) != text) {
    fail("claimed_size must be one canonical decimal integer");
  }
  if (value <= kBaselineSize) fail("claimed_size must exceed 7192");
  if (value > kMaximumSize) fail("claimed_size exceeds the registered verifier bound");
  return value;
}

std::uint32_t parse_point(std::string_view token) {
  if (token.size() != 6) fail("every point must be six lowercase hexadecimal digits");
  std::uint32_t value = 0;
  for (const char character : token) {
    std::uint32_t digit = 0;
    if (character >= '0' && character <= '9') {
      digit = static_cast<std::uint32_t>(character - '0');
    } else if (character >= 'a' && character <= 'f') {
      digit = static_cast<std::uint32_t>(character - 'a' + 10);
    } else {
      fail("every point must be six lowercase hexadecimal digits");
    }
    value = (value << 4U) | digit;
  }
  return value;
}

std::vector<std::uint32_t> parse_points(std::string_view text, std::size_t claimed_size) {
  std::vector<std::uint32_t> points;
  points.reserve(claimed_size);
  std::size_t start = 0;
  while (start <= text.size()) {
    const std::size_t comma = text.find(',', start);
    const std::size_t end = comma == std::string_view::npos ? text.size() : comma;
    if (end == start) fail("points must not contain empty entries");
    points.push_back(parse_point(text.substr(start, end - start)));
    if (points.size() > claimed_size) fail("points count exceeds claimed_size");
    if (comma == std::string_view::npos) break;
    start = comma + 1;
  }
  if (points.size() != claimed_size) fail("points count does not equal claimed_size");
  std::vector<std::uint32_t> ordered = points;
  std::sort(ordered.begin(), ordered.end());
  if (std::adjacent_find(ordered.begin(), ordered.end()) != ordered.end()) {
    fail("points must be distinct");
  }
  return points;
}

std::uint64_t spread(std::uint32_t point) {
  std::uint64_t output = 0;
  for (unsigned bit = 0; bit < 24; ++bit) {
    output |= static_cast<std::uint64_t>((point >> bit) & 1U) << (2U * bit);
  }
  return output;
}

bool distinct_pair_sums(const std::vector<std::uint32_t>& points, std::uint64_t* checked) {
  const std::uint64_t size = points.size();
  const std::uint64_t pair_count = size * (size + 1U) / 2U;
  if (pair_count > std::numeric_limits<std::size_t>::max()) fail("pair count overflows platform");
  std::vector<std::uint64_t> expanded;
  expanded.reserve(points.size());
  for (const std::uint32_t point : points) expanded.push_back(spread(point));
  std::vector<std::uint64_t> sums;
  try {
    sums.resize(static_cast<std::size_t>(pair_count));
  } catch (const std::bad_alloc&) {
    fail("insufficient memory for registered pair-sum check");
  }
  std::size_t index = 0;
  for (std::size_t left = 0; left < expanded.size(); ++left) {
    for (std::size_t right = left; right < expanded.size(); ++right) {
      sums[index++] = expanded[left] + expanded[right];
    }
  }
  std::sort(sums.begin(), sums.end());
  *checked = pair_count;
  return std::adjacent_find(sums.begin(), sums.end()) == sums.end();
}

void self_test() {
  std::uint64_t checked = 0;
  if (!distinct_pair_sums({0U, 1U, 2U}, &checked) || checked != 6U) {
    fail("internal positive self-test failed");
  }
  if (distinct_pair_sums({0U, 1U, 2U, 3U}, &checked)) {
    fail("internal collision self-test failed");
  }
  std::cout << "sidon verifier self-test: passed\n";
}

}  // namespace

int main(int argc, char** argv) {
  if (argc == 2 && std::string_view(argv[1]) == "--self-test") {
    self_test();
    return 0;
  }
  if (argc != 2) fail("usage: verifier <candidate-artifact>");
  const std::string bytes = read_bounded(argv[1]);
  const std::vector<std::string_view> lines = exact_lines(bytes);
  if (value_after(lines[0], "schema=") != "canopus.sidon-a24-witness.v1") {
    fail("unsupported candidate schema");
  }
  if (value_after(lines[1], "target=") != "sidon:a24-improve") fail("wrong target");
  if (value_after(lines[2], "n=") != "24") fail("n must equal 24");
  if (value_after(lines[3], "baseline_size=") != "7192") fail("baseline_size must equal 7192");
  const std::size_t claimed_size = parse_size(value_after(lines[4], "claimed_size="));
  const std::vector<std::uint32_t> points =
      parse_points(value_after(lines[5], "points="), claimed_size);
  std::uint64_t pair_sums = 0;
  if (!distinct_pair_sums(points, &pair_sums)) fail("componentwise pair sums are not distinct");
  std::cout << "{\"claimed_size\":" << claimed_size << ",\"pair_sums\":" << pair_sums
            << ",\"schema\":\"canopus.sidon-a24-verification.v1\",\"status\":\"passed\","
               "\"target\":\"sidon:a24-improve\"}\n";
  return 0;
}
