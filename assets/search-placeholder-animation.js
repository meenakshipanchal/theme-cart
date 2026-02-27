(function() {
  'use strict';

  const searchBar = document.querySelector('.search__input');
  const searchBar2 = document.querySelector('.searchpage');

  const DELAY_AFTER_ANIMATION = 1000;
  const PLACEHOLDERS = [
    'Search for A2 Cow Ghee',
    'Search for Sunflower Oil',
    'Search for Saffron',
    'Search for Groundnut Oil',
    'Search for Honey',
    'Find your favorite items',
  ];

  const getRandomDelayBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

  const setPlaceholder = (inputNode, placeholder) => {
    inputNode.setAttribute('placeholder', placeholder);
  };

  const animateLetters = (currentLetters, remainingLetters, inputNode, onAnimationEnd) => {
    if (!remainingLetters.length) {
      return typeof onAnimationEnd === 'function' && onAnimationEnd(currentLetters.join(''), inputNode);
    }
    currentLetters.push(remainingLetters.shift());
    setTimeout(() => {
      setPlaceholder(inputNode, currentLetters.join(''));
      animateLetters(currentLetters, remainingLetters, inputNode, onAnimationEnd);
    }, getRandomDelayBetween(50, 90));
  };

  const animatePlaceholder = (inputNode, placeholder, onAnimationEnd) => {
    animateLetters([], placeholder.split(''), inputNode, onAnimationEnd);
  };

  const onAnimationEnd = (placeholder, inputNode) => {
    setTimeout(() => {
      let newPlaceholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];
      do {
        newPlaceholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];
      } while (placeholder === newPlaceholder);
      animatePlaceholder(inputNode, newPlaceholder, onAnimationEnd);
    }, DELAY_AFTER_ANIMATION);
  };

  window.addEventListener('load', () => {
    if (searchBar) animatePlaceholder(searchBar, PLACEHOLDERS[0], onAnimationEnd);
    if (searchBar2) animatePlaceholder(searchBar2, PLACEHOLDERS[0], onAnimationEnd);
  });
})();
