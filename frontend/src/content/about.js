export const about = {
  slug: 'about', title: 'About Dr.Writer', description: 'Learn about Dr.Writer and contact its operator in Mumbai, India.',
  intro: 'Dr.Writer is a workspace for writing, editing, and collaborating on documents with AI assistance.',
  sections: [
    { heading: 'Operator', paragraphs: ['Dr.Writer is operated by chatt kush in Mumbai, India.'] },
    { heading: 'Contact', paragraphs: ['For questions about Dr.Writer or support, email chattkush34@gmail.com.'] },
  ],
};
export const privacy = {
  slug: 'privacy', title: 'Privacy notice', description: 'Information about data used by Dr.Writer and how to contact its operator.',
  intro: 'This notice describes the information Dr.Writer uses to provide its document workspace and how to contact its operator about privacy.',
  sections: [
    { heading: 'Operator and contact', paragraphs: ['Dr.Writer is operated by chatt kush in Mumbai, India. For privacy questions or requests, email chattkush34@gmail.com.'] },
    { heading: 'Information used by the service', paragraphs: ['When you create an account, the service uses account information such as your email address to authenticate you. Documents you create or upload, their contents, and sharing details are used to provide editing and collaboration.', 'If you use AI features, your requests and relevant document content may be sent to an AI service to process them. Information sent through integrations depends on the features and services you choose to use.'] },
    { heading: 'Service providers and analytics', paragraphs: ['Dr.Writer uses service providers to help operate features such as authentication, AI, hosting, analytics, and image uploads. The application includes integrations with Firebase, OpenRouter, Vercel Analytics, and Cloudinary; availability depends on the deployment and feature configuration.', 'Vercel Analytics is used to understand visits and page usage. Avoid including sensitive information in prompts or documents unless you are comfortable with the services needed to process them.'] },
    { heading: 'Retention and deletion', paragraphs: ['A data-retention schedule has not yet been established. To ask about your account or documents, including a deletion request, contact chattkush34@gmail.com. We will respond with information about how your request can be handled.'] },
  ],
};
export const terms = {
  slug: 'terms', title: 'Terms of use', description: 'Terms for using Dr.Writer, including acceptable use and the refund window.',
  intro: 'These terms describe the basic conditions for using Dr.Writer, operated by chatt kush in Mumbai, India.',
  sections: [
    { heading: 'Using the service', paragraphs: ['You are responsible for your account and the content you create, upload, or share. Use the service lawfully and only share content or grant access when you have permission to do so.', 'Do not attempt to access another person’s account or documents without authorization, disrupt the service, distribute malware, or use the service to violate others’ rights.'] },
    { heading: 'AI output and collaboration', paragraphs: ['AI suggestions can be inaccurate or incomplete. Review generated content, verify factual claims, and decide whether it is suitable for your purpose. You are responsible for checking the content you publish or share.', 'Choose collaborators carefully. When you share a document, those you add may be able to access and edit its contents.'] },
    { heading: 'Refunds', paragraphs: ['Purchases are eligible for a refund within seven days of purchase. To request a refund, email chattkush34@gmail.com. Include the email associated with your account and enough purchase information for us to identify the transaction.'] },
    { heading: 'Contact and jurisdiction', paragraphs: ['For questions about these terms, contact chattkush34@gmail.com. These terms are governed by the laws of India, subject to applicable law.'] },
  ],
};
export const infoPages = [about, privacy, terms];
