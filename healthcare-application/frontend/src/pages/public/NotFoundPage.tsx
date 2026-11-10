import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../utils/usePageTitle';
import { Navbar } from '../../components/layout/Navbar';
import { DecorativeBorder } from '../../components/ui/DecorativeBorder';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import './NotFoundPage.css';

export const NotFoundPage: React.FC = () => {
  usePageTitle('Page Not Found');

  return (
    <div className="not-found-page">
      <Navbar />
      <div className="container not-found-container">
        <DecorativeBorder variant="card" motifSize={48} className="not-found-card">
          <div className="not-found-inner">
            <span className="not-found-code">404</span>
            <h1 className="not-found-title">Clinical Resource Not Found</h1>
            <p className="not-found-desc">
              The requested health record, passport route, or facility portal URL does not exist or has been relocated.
            </p>
            <div className="not-found-actions">
              <Link to="/">
                <Button variant="primary" size="md" icon={<Icon name="arrow-right" size={16} />}>
                  Return to Main Portal
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="md">
                  Go to Role Login
                </Button>
              </Link>
            </div>
          </div>
        </DecorativeBorder>
      </div>
    </div>
  );
};
