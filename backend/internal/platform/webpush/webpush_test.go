package webpush

import "testing"

func TestSubscriber(t *testing.T) {
	tests := map[string]string{
		"mailto:me@example.com":   "me@example.com",
		"MAILTO: me@example.com":  "me@example.com",
		"me@example.com":          "me@example.com",
		"https://example.com/abc": "https://example.com/abc",
	}
	for in, want := range tests {
		if got := Subscriber(in); got != want {
			t.Errorf("Subscriber(%q) = %q, want %q", in, got, want)
		}
	}
}
