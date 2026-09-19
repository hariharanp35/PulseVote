package app

import "testing"

func TestValidatePoll(t *testing.T) {
	if _, err := validatePoll("Pick one", []string{"Go", "Go"}); err == nil { t.Fatal("expected duplicate options to fail") }
	poll, err := validatePoll("Pick one", []string{"Go", "React"})
	if err != nil || len(poll.Options) != 2 { t.Fatalf("expected valid poll, got %+v %v", poll, err) }
}
func TestValidatePollBounds(t *testing.T) {
	if _, err := validatePoll("x", []string{"a", "b"}); err == nil { t.Fatal("expected short question to fail") }
	if _, err := validatePoll("A valid question", []string{"a"}); err == nil { t.Fatal("expected one option to fail") }
}

func TestPreserveOptionResults(t *testing.T) {
	current := []Option{{ID: "a", Text: "React", Votes: 10}, {ID: "b", Text: "Go", Votes: 5}}
	edited, err := preserveOptionResults(current, []Option{{Text: "React.js"}, {Text: "Golang"}, {ID: "new", Text: "Rust"}})
	if err != nil { t.Fatal(err) }
	if edited[0].ID != "a" || edited[0].Votes != 10 || edited[1].ID != "b" || edited[1].Votes != 5 { t.Fatalf("existing results were not preserved: %+v", edited) }
	if edited[2].Votes != 0 || edited[2].ID != "new" { t.Fatalf("new option should start at zero: %+v", edited[2]) }
}

func TestPreserveOptionResultsRejectsVotedRemoval(t *testing.T) {
	_, err := preserveOptionResults([]Option{{ID: "a", Text: "React", Votes: 1}, {ID: "b", Text: "Go"}}, []Option{{Text: "React"}})
	if err == nil { t.Fatal("expected removal of a voted option to fail") }
}

func TestNormalizeChoiceTypeDefaultsToSingle(t *testing.T) {
	choiceType, err := normalizeChoiceType("")
	if err != nil || choiceType != "SINGLE" { t.Fatalf("expected empty choice type to default to SINGLE, got %q, err=%v", choiceType, err) }
}

func TestNormalizeChoiceTypeAcceptsSupportedValues(t *testing.T) {
	for _, value := range []string{"SINGLE", "MULTIPLE"} {
		choiceType, err := normalizeChoiceType(value)
		if err != nil || choiceType != value { t.Fatalf("expected %q to be accepted, got %q, err=%v", value, choiceType, err) }
	}
	if _, err := normalizeChoiceType("EXACTLY_TWO"); err == nil { t.Fatal("expected Exact Two to be rejected for new polls") }
}

func TestValidateChoiceSelection(t *testing.T) {
	if err := validateChoiceSelection("SINGLE", []string{"a"}, 0); err != nil { t.Fatal(err) }
	if err := validateChoiceSelection("MULTIPLE", []string{"a", "b"}, 2); err != nil { t.Fatal(err) }
	if err := validateChoiceSelection("EXACTLY_TWO", []string{"a", "b"}, 0); err != nil { t.Fatal(err) }
	if err := validateChoiceSelection("EXACTLY_TWO", []string{"a"}, 0); err == nil { t.Fatal("expected exactly-two validation to reject a single selection") }
	if err := validateChoiceSelection("MULTIPLE", []string{"a", "b", "c"}, 2); err == nil { t.Fatal("expected multiple-choice validation to reject too many selections") }
}

func TestSameSelectionsIgnoresOrder(t *testing.T) {
	if !sameSelections([]string{"a", "b"}, []string{"b", "a"}) { t.Fatal("expected selections in a different order to match") }
	if sameSelections([]string{"a"}, []string{"b"}) { t.Fatal("expected different selections not to match") }
}

func TestNotificationEventKey(t *testing.T) {
	keyA := notificationEventKey("VOTE_RECEIVED", "poll-123", "user-abc")
	keyB := notificationEventKey("VOTE_RECEIVED", "poll-123", "user-abc")
	if keyA == "" || keyA != keyB {
		t.Fatalf("expected stable dedupe key for same event, got %q and %q", keyA, keyB)
	}
	if notificationEventKey("VOTE_RECEIVED", "poll-123", "user-xyz") == keyA {
		t.Fatal("expected recipient-specific dedupe key")
	}
}
