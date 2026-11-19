// Phase 1 benchmark dataset: the same OS-concurrency concept written two ways.
// Sample A mimics textbook / lecture-handout style. Sample B is a plain-English rewrite.

export const SAMPLES = Object.freeze({
  dense: {
    id: 'A',
    label: 'Sample A: OS Concurrency',
    blurb: 'Dense textbook paragraph',
    text:
      'In multiprogrammed operating system environments, the concurrent execution of ' +
      'cooperating processes that share mutable state is required to be governed by ' +
      'synchronization primitives, since non-deterministic interleavings of instructions ' +
      'may be produced by the preemptive scheduler. When a critical section is entered by ' +
      'more than one thread without mutual exclusion being enforced, a race condition is ' +
      'introduced, whereby the final value of the shared variable is determined by the ' +
      'arbitrary ordering of context switches rather than by the intended program semantics. ' +
      'Consequently, mechanisms such as mutexes, semaphores, and monitors were developed so ' +
      'that atomicity could be guaranteed, although it must be recognized that the improper ' +
      'acquisition of multiple locks can result in deadlock, a condition in which circular ' +
      'wait is established among processes and forward progress is indefinitely prevented.',
  },

  plain: {
    id: 'B',
    label: 'Sample B: Structured Version',
    blurb: 'Same ideas, plain English',
    text: [
      '**The problem: shared data.** Programs often run several threads at the same time. ' +
        'These threads can read and change the same data.',
      '',
      '**What goes wrong: race conditions.** The scheduler can pause a thread at any moment. ' +
        'If two threads change the same value at once, the result depends on timing. ' +
        'We call this bug a race condition.',
      '',
      '**The fix: locks.** A lock lets only one thread into a risky block of code at a time. ' +
        'Mutexes and semaphores are two common kinds of lock.',
      '',
      '**The catch: deadlock.** Locks can cause a new problem. ' +
        'If two threads each hold a lock the other needs, both wait forever. ' +
        'We call this deadlock.',
    ].join('\n'),
  },

  // Phase 7: a second dense topic, so first-time testers see the problem is not OS-specific.
  algorithm: {
    id: 'C',
    label: 'Sample C: Dense Algorithm Handout',
    blurb: "Dijkstra's shortest paths",
    text:
      'Given a weighted directed graph with non-negative edge weights, the single-source ' +
      "shortest-path problem is solved by Dijkstra's algorithm, wherein a priority queue keyed " +
      'on tentative distances is maintained such that the vertex with minimal provisional ' +
      'distance is extracted at each iteration and its outgoing edges are relaxed, whereby the ' +
      'distance estimate of each adjacent vertex is decreased whenever a shorter path through ' +
      'the extracted vertex is discovered. Correctness is established by an inductive invariant ' +
      'asserting that every extracted vertex has attained its final shortest-path distance, ' +
      'although it must be noted that this guarantee is invalidated in the presence of negative ' +
      'edge weights, for which the Bellman-Ford algorithm, with its higher asymptotic ' +
      'complexity, must instead be employed.',
  },

  // Phase 3: real-world lecture notes full of regex traps (abbreviations, decimals, a URL,
  // an ellipsis, acronyms). It has exactly 5 sentences. (Called "Sample C" in Phases 3-5.)
  messy: {
    id: 'D',
    label: 'Sample D: Messy Lecture Notes',
    blurb: 'Abbreviations, units, a URL',
    expectedSentences: 5,
    text:
      "Dr. Rao's lecture covers CPU scheduling, e.g. round-robin and SJF, as shown in Fig. 2 on p. 14. " +
      'A time quantum of 2.5 ms is typical, i.e. short enough for interactive use. ' +
      'See https://example.edu/os/notes.html for details... ' +
      'The CPU switches context approx. every 10 ms vs. 100 ms in older systems. ' +
      'Prof. Iyer et al. measured a 3.2x speedup.',
  },
});
