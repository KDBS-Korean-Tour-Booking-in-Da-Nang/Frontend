import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { API_ENDPOINTS } from '../../../../config/api';
import { Search, Hash, User, FileText, TrendingUp, X, Check, History } from 'lucide-react';
import styles from './SearchSidebar.module.css';

const SearchSidebar = ({ mode = 'sticky', fixedStyle = {}, onSearch, onHashtagFilter, selectedHashtags: externalSelectedHashtags, isAdminStaffView = false }) => {
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
  const dropdownRef = useRef(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const [showAllHashtags, setShowAllHashtags] = useState(false);
  const isInternalUpdate = useRef(false);
  const pendingFilterUpdate = useRef(null);

  useEffect(() => {
    fetchPopularHashtags();
    loadSearchHistory();
    
    const savedSearchKeyword = localStorage.getItem('forum-search-keyword');
    if (savedSearchKeyword) {
      setSearchKeyword(savedSearchKeyword);
    }
  }, []);

  // Đồng bộ với external selected hashtags (từ forum.jsx): sync selectedHashtags với externalSelectedHashtags nếu không phải internal update
  useEffect(() => {
    if (externalSelectedHashtags && !isInternalUpdate.current) {
      setSelectedHashtags(externalSelectedHashtags);
    }
    isInternalUpdate.current = false;
  }, [externalSelectedHashtags]);

  // Handle pending filter updates
  useEffect(() => {
    if (pendingFilterUpdate.current) {
      onHashtagFilter(pendingFilterUpdate.current);
      pendingFilterUpdate.current = null;
    }
  }, [selectedHashtags, onHashtagFilter]);

  // Load search history từ localStorage: parse JSON và set vào searchHistory state
  const loadSearchHistory = () => {
    try {
      const history = localStorage.getItem('forum-search-history');
      if (history) {
        const parsedHistory = JSON.parse(history);
        setSearchHistory(parsedHistory);
      }
    } catch (error) {
      // Silently handle error
    }
  };

  // Save search history vào localStorage: thêm keyword vào đầu history, remove duplicates, giữ tối đa 10 recent searches
  const saveSearchHistory = (keyword) => {
    if (!keyword || keyword.trim() === '') return;
    
    try {
      const trimmedKeyword = keyword.trim();
      const newHistory = [trimmedKeyword, ...searchHistory.filter(item => item !== trimmedKeyword)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('forum-search-history', JSON.stringify(newHistory));
    } catch (error) {
      // Silently handle error
    }
  };

  // Expose refresh method cho parent qua global event: lắng nghe 'refresh-popular-hashtags' event và gọi fetchPopularHashtags
  useEffect(() => {
    const handler = () => fetchPopularHashtags();
    window.addEventListener('refresh-popular-hashtags', handler);
    return () => window.removeEventListener('refresh-popular-hashtags', handler);
  }, []);

  // Fetch popular hashtags từ API: gọi HASHTAGS_POPULAR endpoint với limit=30, map hashtags sang format (content, count), fallback về mock data nếu API fail
  const fetchPopularHashtags = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.HASHTAGS_POPULAR}?limit=30`);
      if (response.ok) {
        const hashtags = await response.json();
        setPopularHashtags(hashtags.map(h => ({
          content: h.content,
          count: h.postCount || 0
        })));
      } else {
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
      const keyword = searchKeyword.trim();
      onSearch(keyword);
      saveSearchHistory(keyword);
      setShowSuggest(false);
      setSelectedIndex(-1);
    }
  };

  const handleHashtagClick = (hashtag, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const hashtagContent = hashtag.content;
    
    setSelectedHashtags(prev => {
      let newSelected;
      if (prev.includes(hashtagContent)) {
        newSelected = prev.filter(tag => tag !== hashtagContent);
      } else {
        newSelected = [...prev, hashtagContent];
      }
      
      isInternalUpdate.current = true;
      
      pendingFilterUpdate.current = newSelected;
      
      return newSelected;
    });
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    onSearch(''); // This will clear both search and hashtag filters
    setSuggestions([]);
    setShowSuggest(false);
    setSelectedIndex(-1);
  };

  const handleHistoryClick = (keyword, e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    isUpdatingFromSuggestion.current = true;
    
    setSearchKeyword(keyword);
    onSearch(keyword);
    
    setShowSuggest(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    
    setTimeout(() => {
      isUpdatingFromSuggestion.current = false;
    }, 500);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleRemoveHistoryItem = (keyword, e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    const newHistory = searchHistory.filter(item => item !== keyword);
    setSearchHistory(newHistory);
    try {
      localStorage.setItem('forum-search-history', JSON.stringify(newHistory));
    } catch (error) {
      // Silently handle error
    }
  };

  // Clear tất cả search history: clear searchHistory state và remove từ localStorage
  const handleClearAllHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('forum-search-history');
    } catch (error) {
      // Silently handle error
    }
  };

  // Debounced live suggestions
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSuggestions([]);
      // Show history if input is focused and we have history
      if (isInputFocused && searchHistory.length > 0) {
        setShowSuggest(true);
      } else if (!isInputFocused || searchHistory.length === 0) {
        setShowSuggest(false);
        setSelectedIndex(-1);
      }
      return;
    }
    
    // Don't fetch suggestions if we're currently clicking a suggestion or updating from suggestion
    if (isClickingSuggestion.current || isUpdatingFromSuggestion.current) {
      return;
    }
    
    // Always show suggestions when typing
    setShowSuggest(true);
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetchSuggestions(searchKeyword.trim());
    }, 300);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [searchKeyword, searchHistory.length, isInputFocused]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const onClick = (e) => {
      if (!rootRef.current) return;
      // Check if click is outside the entire search component AND dropdown
      const isOutsideRoot = !rootRef.current.contains(e.target);
      const isOutsideDropdown = !dropdownRef.current || !dropdownRef.current.contains(e.target);
      
      if (isOutsideRoot && isOutsideDropdown) {
        setShowSuggest(false);
        setSelectedIndex(-1);
        setIsInputFocused(false);
      }
    };
    if (showSuggest) {
      // Add a small delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('click', onClick);
      }, 100);
    }
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
        fetch(`${API_ENDPOINTS.POST_SEARCH}?keyword=${encodeURIComponent(q)}&size=5&sort=createdAt,desc`),
        fetch(`${API_ENDPOINTS.HASHTAGS_SEARCH}?keyword=${encodeURIComponent(q)}&limit=5`)
      ]);

      const result = [];

      // Process posts suggestions
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        const posts = postsData.content || [];
        
        posts.forEach(p => {
          // Add post titles
          if (p.title && p.title.toLowerCase().includes(q.toLowerCase())) {
            result.push({ 
              type: 'post', 
              text: p.title, 
              subtitle: `${t('forum.search.by')} ${p.username}`,
              postId: p.forumPostId,
              icon: 'post'
            });
          }
          
          // Add usernames
          if (p.username && p.username.toLowerCase().includes(q.toLowerCase())) {
            result.push({ 
              type: 'user', 
              text: p.username, 
              subtitle: t('forum.search.user'),
              icon: 'user'
            });
          }
        });
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
            icon: 'hashtag'
          });
        });
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

      setSuggestions(dedup.slice(0, 8));
      setShowSuggest(true);
      setSelectedIndex(-1);
    } catch (e) {
      // Silently handle error fetching suggestions
      setSuggestions([]);
      setShowSuggest(false);
    }
  };

  const clickSuggestion = (s, e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    // Set flag to prevent re-fetching suggestions
    isUpdatingFromSuggestion.current = true;
    
    // Perform the appropriate action
    if (s.type === 'hashtag') {
      const tag = s.hashtag || s.text.replace(/^#/, '');
      onHashtagFilter([tag]);
      // Don't clear search input - let the parent handle the mode switching
    } else {
      // For all other types (user, post, trending), perform search
      onSearch(s.text);
      setSearchKeyword(s.text); // Update the search keyword in the input
    }
    
    // Close suggestions after action
    setShowSuggest(false);
    setSelectedIndex(-1);
    setSuggestions([]); // Clear suggestions to prevent re-fetching
    
    // Reset flag after a short delay
    setTimeout(() => {
      isUpdatingFromSuggestion.current = false;
    }, 500);
  };

  // Position dropdown like YouTube (anchored to input, fixed on viewport)
  const updateDropdownPos = () => {
    if (!inputRef.current || !rootRef.current) return;
    const inputRect = inputRef.current.getBoundingClientRect();
    const sidebarRect = rootRef.current.getBoundingClientRect();
    
    // Calculate width: use input width but don't exceed sidebar width
    const maxWidth = sidebarRect.width;
    const dropdownWidth = Math.min(inputRect.width, maxWidth);
    
    // Ensure dropdown doesn't overflow viewport
    let left = inputRect.left;
    
    // If dropdown would overflow right side, align it to the right edge of sidebar
    if (left + dropdownWidth > sidebarRect.right) {
      left = sidebarRect.right - dropdownWidth;
    }
    
    // Ensure dropdown doesn't go off left edge of viewport
    if (left < 0) {
      left = 0;
    }
    
    setSuggestPos({ 
      left: left, 
      top: inputRect.bottom + 6, 
      width: dropdownWidth,
      maxWidth: maxWidth
    });
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

  // Update dropdown position when showSuggest changes
  useEffect(() => {
    if (showSuggest) {
      updateDropdownPos();
    }
  }, [showSuggest]);

  const visibleHashtags = showAllHashtags
    ? popularHashtags
    : popularHashtags.slice(0, 8);

  return (
    <div
      className={`${styles['search-sidebar']} search-sidebar ${mode === 'fixed' ? styles['fixed'] : ''}`}
      style={mode === 'fixed' ? fixedStyle : undefined}
      ref={rootRef}
      data-admin-staff-view={isAdminStaffView ? 'true' : 'false'}
    >
      <div className={styles['search-section']}>
        <h3 className={styles['sidebar-title']}>{t('forum.search.title')}</h3>
        <form onSubmit={handleSearch} className={styles['search-form']}>
          <div className={styles['search-input-container']}>
            <input
              type="text"
              placeholder={t('forum.search.placeholder')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles['search-input']}
              onFocus={() => {
                setIsInputFocused(true);
                // Always show suggestions when focused
                if (searchKeyword.trim()) {
                  setShowSuggest(true);
                } else if (searchHistory.length > 0) {
                  setShowSuggest(true);
                }
              }}
              onBlur={() => {
                // Delay blur to allow clicking on suggestions
                setTimeout(() => {
                  setIsInputFocused(false);
                }, 150);
              }}
              ref={inputRef}
            />
            <button type="submit" className={styles['search-btn']}>
              <Search size={18} strokeWidth={1.5} />
            </button>
          </div>
          {showSuggest && (suggestions.length > 0 || (searchHistory.length > 0 && !searchKeyword.trim())) && createPortal(
            <div ref={dropdownRef} className={styles['search-suggest']} style={{ position: 'fixed', left: suggestPos.left, top: suggestPos.top, width: suggestPos.width, maxWidth: suggestPos.maxWidth || suggestPos.width }}>
              {suggestions.length > 0 ? (
                // Show suggestions when typing
                suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles['suggest-item']} ${styles[s.type] || ''} ${selectedIndex === idx ? styles['selected'] : ''}`}
                    onClick={(e) => clickSuggestion(s, e)}
                  >
                    <span className={styles['icon']}>
                      {s.icon === 'hashtag' || s.type === 'hashtag' ? (
                        <Hash size={16} strokeWidth={1.5} />
                      ) : s.icon === 'user' || s.type === 'user' ? (
                        <User size={16} strokeWidth={1.5} />
                      ) : s.icon === 'post' || s.type === 'post' ? (
                        <FileText size={16} strokeWidth={1.5} />
                      ) : s.icon === 'trending' || s.type === 'trending' ? (
                        <TrendingUp size={16} strokeWidth={1.5} />
                      ) : (
                        <Search size={16} strokeWidth={1.5} />
                      )}
                    </span>
                    <div className={styles['suggest-content']}>
                      <span className={styles['text']}>{s.text}</span>
                      {s.subtitle && <span className={styles['subtitle']}>{s.subtitle}</span>}
                    </div>
                  </button>
                ))
              ) : (
                // Show search history when focused and no suggestions
                searchHistory.length > 0 && (
                  <>
                    <div className={styles['history-header']}>
                      <div className={styles['history-title-wrapper']}>
                        <History size={14} strokeWidth={1.5} />
                        <span className={styles['history-title']}>{t('forum.search.recentSearches')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearAllHistory}
                        className={styles['clear-all-history-btn']}
                        title={t('forum.search.clearRecent')}
                      >
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                    {searchHistory.map((keyword, index) => (
                      <div
                        key={index}
                        className={styles['history-item']}
                        onMouseDown={(e) => {
                          handleHistoryClick(keyword, e);
                        }}
                        title={`Click để tìm kiếm "${keyword}"`}
                      >
                        <span className={styles['history-keyword']}>{keyword}</span>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            handleRemoveHistoryItem(keyword, e);
                          }}
                          className={styles['remove-history-btn']}
                          title={t('forum.search.removeFromHistory')}
                        >
                          <X size={12} strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                  </>
                )
              )}
            </div>, document.body)
          }
        </form>
      </div>

      <div className={styles['hashtags-section']}>
        <div className={styles['hashtags-header']}>
          <h3 className={styles['sidebar-title']}>{t('forum.search.popularHashtags')}</h3>
          {selectedHashtags.length > 0 && (
            <button 
              className={styles['clear-hashtags-btn']}
              onClick={() => {
                isInternalUpdate.current = true;
                setSelectedHashtags([]);
                pendingFilterUpdate.current = [];
              }}
              title={t('forum.filter.clearAll')}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
        <div className={styles['hashtags-list']}>
          {visibleHashtags.map((hashtag, index) => {
            const isSelected = selectedHashtags.includes(hashtag.content);
            return (
              <button
                key={index}
                onClick={(e) => handleHashtagClick(hashtag, e)}
                className={`${styles['hashtag-item']} ${isSelected ? styles['selected'] : ''}`}
              >
                {isSelected && (
                  <span className={styles['hashtag-check']}>
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                )}
                <span className={styles['hashtag-text']}>#{hashtag.content}</span>
                <span className={styles['hashtag-count']}>{hashtag.count}</span>
              </button>
            );
          })}
        </div>
        {!showAllHashtags && popularHashtags.length >= 8 && (
          <button
            type="button"
            className={styles['view-more-hashtags-btn']}
            onClick={() => setShowAllHashtags(true)}
          >
            {t('forum.search.viewMoreHashtags')}
          </button>
        )}
      </div>

    </div>
  );
};

export default SearchSidebar;
