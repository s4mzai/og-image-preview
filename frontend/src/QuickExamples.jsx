import githubLogo from './assets/appsLogo/github.svg';
import vercelLogo from './assets/appsLogo/vercel.svg';
import stripeLogo from './assets/appsLogo/stripe.svg';
import ycLogo from './assets/appsLogo/ycombinator.svg';
import openaiLogo from './assets/appsLogo/openai.svg';
import notionLogo from './assets/appsLogo/notion.svg';
import './QuickExamples.css';

const examples = [
  { name: 'GitHub', url: 'https://github.com', logo: githubLogo },
  { name: 'Vercel', url: 'https://vercel.com', logo: vercelLogo },
  { name: 'Stripe', url: 'https://stripe.com', logo: stripeLogo },
  { name: 'Y Combinator', url: 'https://ycombinator.com', logo: ycLogo },
  { name: 'OpenAI', url: 'https://openai.com', logo: openaiLogo },
  { name: 'Notion', url: 'https://notion.so', logo: notionLogo },
];

export default function QuickExamples({ onSelect }) {
  return (
    <div className="quick-examples-container">
      <div className="quick-examples-header">
        <div className="header-line"></div>
        <span className="header-text">Quick examples</span>
        <div className="header-line"></div>
      </div>
      <div className="quick-examples-list">
        {examples.map((ex, index) => (
          <div 
            className="quick-example-item" 
            key={ex.name}
            style={{ '--i': index }}
          >
            <button 
              className="quick-example-btn" 
              onClick={() => onSelect(ex.url)}
              type="button"
              aria-label={`Preview ${ex.name}`}
            >
              <img src={ex.logo} alt="" className="quick-example-icon" />
              <span className="quick-example-name">{ex.name}</span>
            </button>
            {index < examples.length - 1 && <div className="quick-example-divider" aria-hidden="true"></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
