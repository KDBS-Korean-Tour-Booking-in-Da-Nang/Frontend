import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import './SearchSidebar.css';

const SearchSidebar = ({ onSearch, onHashtagFilter }) => {
  const { t } = useTranslation();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [popularHashtags, setPopularHashtags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const timerRef = useRef(null);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [suggestPos, setSuggestPos] = useState({ left: 0, top: 0, width: 0 });
  const isClickingSuggestion = useRef(false);
  const isUpdatingFromSuggestion = useRef(false);

  useEffect(() => {
    fetchPopularHashtags();
  }, []);

  // Expose a refresh method to parent via global event
  useEffect(() => {
    const handler = () => fetchPopularHashtags();
    window.addEventListener('refresh-popular-hashtags', handler);
    return () => window.removeEventListener('refresh-popular-hashtags', handler);
  }, []);

  const fetchPopularHashtags = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/hashtags/popular?limit=8');
      if (response.ok) {
        const hashtags = await response.json();
        setPopularHashtags(hashtags.map(h => ({
          content: h.content,
          count: h.postCount || 0
        })));
      } else {
        // Fallback to mock data
        const mockHashtags = [
          { content: 'technology', count: 156 },
          { content: 'business', count: 89 },
          { content: 'startup', count: 67 },
          { content: 'innovation', count: 45 },
          { content: 'marketing', count: 34 },
          { content: 'finance', count: 28 },
          { content: 'design', count: 23 },
          { content: 'education', count: 19 }
        ];
        setPopularHashtags(mockHashtags);
      }
    } catch (error) {
      console.error('Error fetching popular hashtags:', error);
      // Fallback to mock data
      const mockHashtags = [
        { content: 'technology', count: 156 },
        { content: 'business', count: 89 },
        { content: 'startup', count: 67 },
        { content: 'innovation', count: 45 },
        { content: 'marketing', count: 34 },
        { content: 'finance', count: 28 },
        { content: 'design', count: 23 },
        { content: 'education', count: 19 }
      ];
      setPopularHashtags(mockHashtags);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      onSearch(searchKeyword.trim());
      setShowSuggest(false);
      setSelectedIndex(-1);
    }
  };

  const handleHashtagClick = (hashtag) => {
    onHashtagFilter([hashtag.content]);
    setSearchKeyword(''); // Clear search input when clicking hashtag
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    onSearch(''); // This will clear both search and hashtag filters
    setSuggestions([]);
    setShowSuggest(false);
    setSelectedIndex(-1);
  };

  // Debounced live suggestions
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSuggestions([]);
      setShowSuggest(false);
      setSelectedIndex(-1);
      return;
    }

    // Don't fetch suggestions if we're currently clicking a suggestion or updating from suggestion
    if (isClickingSuggestion.current || isUpdatingFromSuggestion.current) {
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetchSuggestions(searchKeyword.trim());
    }, 300);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [searchKeyword]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const onClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target) && !isClickingSuggestion.current) {
        setShowSuggest(false);
        setSelectedIndex(-1);
      }
    };
    if (showSuggest) document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [showSuggest]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggest || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          clickSuggestion(suggestions[selectedIndex], e);
        } else if (searchKeyword.trim()) {
          onSearch(searchKeyword.trim());
          setShowSuggest(false);
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        setShowSuggest(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const fetchSuggestions = async (q) => {
    try {
      // Fetch both posts and hashtags suggestions in parallel
      const [postsRes, hashtagsRes] = await Promise.all([
        fetch(`http://localhost:8080/api/posts/search?keyword=${encodeURIComponent(q)}&size=5&sort=createdAt,desc`),
        fetch(`http://localhost:8080/api/hashtags/search?keyword=${encodeURIComponent(q)}&limit=5`)
      ]);

      const result = [];

      // Process posts suggestions
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        const posts = postsData.content || [];
        console.log('Fetched posts for suggestions:', posts); // Debug log

        posts.forEach(p => {
          // Add post titles
          if (p.title && p.title.toLowerCase().includes(q.toLowerCase())) {
            result.push({
              type: 'post',
              text: p.title,
              subtitle: `${t('forum.search.by')} ${p.username}`,
              postId: p.forumPostId,
              icon: '📝'
            });
          }

          // Add usernames
          if (p.username && p.username.toLowerCase().includes(q.toLowerCase())) {
            result.push({
              type: 'user',
              text: p.username,
              subtitle: t('forum.search.user'),
              icon: '👤'
            });
          }
        });
      } else {
        console.log('Posts API failed:', postsRes.status, postsRes.statusText); // Debug log
      }

      // Process hashtags suggestions
      if (hashtagsRes.ok) {
        const hashtags = await hashtagsRes.json();
        hashtags.forEach(h => {
          result.push({
            type: 'hashtag',
            text: `#${h.content}`,
            subtitle: `${h.postCount || 0} ${t('forum.search.posts')}`,
            hashtag: h.content,
            icon: '#'
          });
        });
      }

      // Add trending topics if query is short
      if (q.length <= 2) {
        const trendingTopics = [
          { type: 'trending', text: 'Công nghệ AI mới nhất', icon: '🔥' },
          { type: 'trending', text: 'Startup thành công', icon: '🚀' },
          { type: 'trending', text: 'Marketing số', icon: '📈' },
          { type: 'trending', text: 'Đầu tư tài chính', icon: '💰' }
        ];
        result.push(...trendingTopics);
      }

      // Deduplicate by text
      const seen = new Set();
      const dedup = [];
      for (const r of result) {
        if (!r.text) continue;
        const key = r.text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        dedup.push(r);
      }

      console.log('Final suggestions:', dedup.slice(0, 8)); // Debug log
      setSuggestions(dedup.slice(0, 8));
      setShowSuggest(true);
      setSelectedIndex(-1);
    } catch (e) {
      console.error('Error fetching suggestions:', e);
      setSuggestions([]);
      setShowSuggest(false);
    }
  };

  const clickSuggestion = (s, e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Clicking suggestion:', s); // Debug log

    // Close suggestions immediately to prevent re-opening
    setShowSuggest(false);
    setSelectedIndex(-1);
    setSuggestions([]); // Clear suggestions to prevent re-fetching

    // Set flag to prevent outside click from closing suggestions
    isClickingSuggestion.current = true;

    // Perform the appropriate action
    if (s.type === 'hashtag') {
      const tag = s.hashtag || s.text.replace(/^#/, '');
      console.log('Filtering by hashtag:', tag); // Debug log
      onHashtagFilter([tag]);
      setSearchKeyword(''); // Clear search input when filtering by hashtag
    } else {
      // For all other types (user, post, trending), perform search
      console.log('Searching for:', s.text); // Debug log
      console.log('Calling onSearch with:', s.text); // Debug log
      onSearch(s.text);
      console.log('Setting search keyword to:', s.text); // Debug log

      // Set flag to prevent re-fetching suggestions
      isUpdatingFromSuggestion.current = true;
      setSearchKeyword(s.text); // Update the search keyword in the input

      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingFromSuggestion.current = false;
      }, 500);
    }

    // Reset flag after a short delay
    setTimeout(() => {
      isClickingSuggestion.current = false;
    }, 200);
  };

  // Position dropdown like YouTube (anchored to input, fixed on viewport)
  const updateDropdownPos = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setSuggestPos({ left: rect.left, top: rect.bottom + 6, width: rect.width });
  };
  useEffect(() => {
    updateDropdownPos();
    window.addEventListener('resize', updateDropdownPos);
    window.addEventListener('scroll', updateDropdownPos, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPos);
      window.removeEventListener('scroll', updateDropdownPos, true);
    };
  }, []);

  return (
    <div className="search-sidebar" ref={rootRef}>
      <div className="search-section">
        <h3 className="sidebar-title">{t('forum.search.title')}</h3>
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-container">
            <input
              type="text"
              placeholder={t('forum.search.placeholder')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="search-input"
              onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
              ref={inputRef}
            />
            <button type="submit" className="search-btn">
              🔍
            </button>
          </div>
          {showSuggest && suggestions.length > 0 && createPortal(
            <div className="search-suggest" style={{ position: 'fixed', left: suggestPos.left, top: suggestPos.top, width: suggestPos.width }}>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`suggest-item ${s.type} ${selectedIndex === idx ? 'selected' : ''}`}
                  onClick={(e) => clickSuggestion(s, e)}
                >
                  <span className="icon">{s.icon || (s.type === 'hashtag' ? '#' : s.type === 'user' ? '👤' : '🔎')}</span>
                  <div className="suggest-content">
                    <span className="text">{s.text}</span>
                    {s.subtitle && <span className="subtitle">{s.subtitle}</span>}
                  </div>
                </button>
              ))}
            </div>, document.body)
          }
          {searchKeyword && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="clear-search-btn"
            >
              {t('forum.search.clearButton')}
            </button>
          )}
        </form>
      </div>

      <div className="hashtags-section">
        <h3 className="sidebar-title">{t('forum.search.popularHashtags')}</h3>
        <div className="hashtags-list">
          {popularHashtags.map((hashtag, index) => (
            <button
              key={index}
              onClick={() => handleHashtagClick(hashtag)}
              className="hashtag-item"
            >
              <span className="hashtag-text">#{hashtag.content}</span>
              <span className="hashtag-count">{hashtag.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="trending-section">
        <h3 className="sidebar-title">{t('forum.sidebar.trendingTopics')}</h3>
        <div className="trending-topics">
          <div className="trending-topic">
            <span className="topic-number">1</span>
            <span className="topic-text">{t('forum.trendingTopics.ai')}</span>
          </div>
          <div className="trending-topic">
            <span className="topic-number">2</span>
            <span className="topic-text">{t('forum.trendingTopics.startup')}</span>
          </div>
          <div className="trending-topic">
            <span className="topic-number">3</span>
            <span className="topic-text">{t('forum.trendingTopics.marketing')}</span>
          </div>
          <div className="trending-topic">
            <span className="topic-number">4</span>
            <span className="topic-text">{t('forum.trendingTopics.finance')}</span>
          </div>
          <div className="trending-topic">
            <span className="topic-number">5</span>
            <span className="topic-text">{t('forum.trendingTopics.design')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchSidebar;
