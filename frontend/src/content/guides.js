export const guides = [
  {
    slug: 'improve-a-draft-with-ai',
    title: 'How to improve a first draft with AI',
    description: 'Use AI to find clarity and structure in a draft, while reviewing every suggestion and keeping your own voice.',
    intro: 'AI is most useful as a second reader: give it a specific problem, compare its suggestions with your original, and keep the decisions that serve your reader.',
    sections: [
      { heading: 'Start with your purpose', paragraphs: ['Before asking for edits, write down who the draft is for and what the reader should understand or do. Identify the part that needs attention: the opening, the order of ideas, or sentences that are hard to follow.', 'A focused request gives you a better starting point than asking an assistant to “make it better.”'] },
      { heading: 'Ask for feedback before a rewrite', paragraphs: ['Open a document in Dr.Writer and use Discuss mode to ask the assistant about your draft. For example: “Identify the main point in this introduction and tell me where a reader might get lost. Do not rewrite it yet.”', 'Then ask a follow-up that names the audience and constraint: “Suggest a shorter opening for a busy reader, keeping the factual claims and a friendly tone.”'] },
      { heading: 'Review proposed edits', paragraphs: ['When you want the assistant to propose changes, switch to Edit mode and describe the change. Read the proposed edits in context, then accept or discard them. A fluent sentence is not necessarily a correct one.', 'Check names, numbers, quotations, links and factual claims against your sources. If the suggestion changes your meaning or removes a useful detail, discard it or revise it yourself.'] },
      { heading: 'Keep the final voice yours', paragraphs: ['Read the whole passage aloud after editing. Restore the words and examples that make the writing sound like you, and remove repetition introduced during revision.', 'For sensitive material, consider what you are comfortable sharing with an AI provider before sending it. Save or export a copy when the draft is ready.'] },
    ],
  },
  {
    slug: 'collaborate-on-a-document',
    title: 'How to collaborate on a document without losing context',
    description: 'A practical workflow for sharing a document, coordinating edits, and reviewing a final version together.',
    intro: 'A shared document works best when the team agrees on its purpose, knows who is responsible for each section, and reviews the same final version.',
    sections: [
      { heading: 'Set up a shared starting point', paragraphs: ['Create or open a document and put its goal, audience, and deadline at the top. Add a simple outline before inviting collaborators; it gives everyone a place to work and makes gaps easier to spot.', 'Decide who owns the final decision and which sections each person will review. This keeps overlapping edits from becoming a debate about ownership.'] },
      { heading: 'Invite a collaborator in Dr.Writer', paragraphs: ['In the document editor, open the add-user dialog, enter your collaborator’s email address, and select Add User. The person must have an account associated with that email for the invitation to work.', 'After sharing, ask them to open the document and confirm access. If the dialog reports an error, check the address and try again. Share only with people who need access.'] },
      { heading: 'Coordinate the editing pass', paragraphs: ['Agree on the kind of feedback needed: factual review, structural feedback, or a final copy edit. For larger changes, explain the proposed direction to the team before rewriting another person’s section.', 'Collaborators can work in the same document with live updates. If someone is working offline or has connection trouble, confirm their changes have synced before treating the document as final.'] },
      { heading: 'Review and deliver', paragraphs: ['Have one person read the document from beginning to end for consistent terminology, missing context, and repeated ideas. Check any AI-generated wording and factual claims against the original sources.', 'When the team agrees on the final version, export it as DOCX or use the PDF option and your browser’s print dialog to save a PDF. Open the exported file and check formatting before sharing it.'] },
    ],
  },
];
