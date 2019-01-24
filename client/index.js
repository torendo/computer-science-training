import React from 'react';
import {render} from 'react-dom';
import Root from './containers/root';
import {AppContainer} from 'react-hot-loader';
import configureStore from './configureStore';

const store = configureStore();

const container = document.getElementById('app');
const renderApp = () => render(
  <AppContainer>
    <Root store={store} />
  </AppContainer>, container);

renderApp();

// Hot Module Replacement API
if (module.hot) {
  module.hot.accept('./containers/root', () => {
    renderApp();
  });
}