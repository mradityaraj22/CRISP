// Phase 1 benchmark dataset: the same OS-concurrency concept written two ways.
// Sample A mimics textbook / lecture-handout style. Sample B is a plain-English rewrite.

export const SAMPLES = Object.freeze({
  dense: {
    id: 'A',
    label: 'Sample A: Dense technical prose',
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
    label: 'Sample B: Structured plain English',
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
});
