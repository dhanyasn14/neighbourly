import React, { useState } from 'react';
import './CommunityAI.css';
import { apiFetch } from '../services/api';
import PageNav from '../components/PageNav';

const quickPrompts = [
  'What alerts are active today?',
  'Show upcoming meetings this week.',
  'Who can help with tuition?',
  'What ShareCare posts are active?',
];

function CommunityAI() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const askAssistant = async (prompt = question) => {
    const value = String(prompt || '').trim();
    if (!value) return;

    setLoading(true);
    setError('');

    try {
      const res = await apiFetch('/ai/assistant', {
        method: 'POST',
        body: { question: value },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to get an AI answer.');
        setAnswer(null);
        return;
      }

      setAnswer({ question: value, ...data });
      setQuestion('');
    } catch (err) {
      setError('Unable to reach the AI assistant.');
      setAnswer(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    askAssistant();
  };

  return (
    <div className="community-ai-page">
      <PageNav />
      <section className="page-hero compact ai-hero">
        <span className="eyebrow">Community AI</span>
        <h1>Ask across residents, meetings, alerts, events, sharing, and accounts.</h1>
      </section>

      <section className="ai-workspace">
        <div className="ai-prompt-panel">
          <form onSubmit={handleSubmit}>
            <label htmlFor="ai-question">Question</label>
            <textarea
              id="ai-question"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask about upcoming events, meeting status, active warnings, residents, donations..."
              rows="5"
              maxLength={500}
            />
            <button type="submit" disabled={loading || !question.trim()}>
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
              {loading ? 'Thinking' : 'Ask AI'}
            </button>
          </form>

          <div className="quick-prompts" aria-label="Quick prompts">
            {quickPrompts.map(prompt => (
              <button type="button" key={prompt} onClick={() => askAssistant(prompt)} disabled={loading}>
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="ai-answer-panel">
          {!answer && !error && (
            <div className="ai-empty-state">
              <i className="fa-solid fa-comments" aria-hidden="true"></i>
              <strong>Neighborly records are ready.</strong>
            </div>
          )}

          {error && (
            <div className="ai-error">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
              <span>{error}</span>
            </div>
          )}

          {answer && (
            <article className="ai-answer-card">
              <div className="ai-answer-head">
                <span>{answer.confidence} confidence</span>
                <small>{answer.model}</small>
              </div>
              <h2>{answer.question}</h2>
              <p>{answer.answer}</p>

              {answer.sources?.length > 0 && (
                <div className="ai-source-list">
                  <strong>Sources</strong>
                  {answer.sources.map((source, index) => (
                    <span key={`${source.collection}-${source.recordId}-${index}`}>
                      {source.label || source.recordId} · {source.collection}
                    </span>
                  ))}
                </div>
              )}

              {answer.suggestedActions?.length > 0 && (
                <div className="ai-actions-list">
                  <strong>Next</strong>
                  {answer.suggestedActions.map(action => (
                    <span key={action}>{action}</span>
                  ))}
                </div>
              )}
            </article>
          )}
        </div>
      </section>
    </div>
  );
}

export default CommunityAI;
