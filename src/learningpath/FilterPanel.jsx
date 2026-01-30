import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonGroup, Form, Icon, IconButton,
} from '@openedx/paragon';
import { FilterList, Close } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import messages from './message';

const FilterPanel = ({
  selectedStatuses,
  onChangeStatus,
  selectedDateStatuses,
  onChangeDateStatus,
  selectedOrgs,
  onChangeOrg,
  organizations,
  onClose,
  isSmall,
  onClearAll,
}) => {
  const { formatMessage } = useIntl();

  return (
    <div className="pl-3 pr-3 pt-2 mt-4.5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">{formatMessage(messages.filterTitle)}</h4>
        {!isSmall && (
        <Button
          variant="link"
          onClick={onClearAll}
          className="pr-4 filter-clear-link"
        >
          {formatMessage(messages.clearAll)}
        </Button>
        )}
        <IconButton
          src={Close}
          iconAs={Icon}
          onClick={onClose}
          className={`filter-panel-button filter-panel-button ${isSmall ? 'mobile' : 'desktop'}`}
          alt={formatMessage(messages.closeFilterAlt)}
          isActive
        />
      </div>

      <div className="my-3">
        <Form.Group>
          <Form.Label className="h4 my-3">{formatMessage(messages.myInvitations)}</Form.Label>
          <Form.CheckboxSet
            name="progress-status"
            onChange={e => onChangeStatus(e.target.value, e.target.checked)}
            value={selectedStatuses}
          >
            <Form.Checkbox value="Accepted" className="font-weight-light">
              {formatMessage(messages.accepted)}
            </Form.Checkbox>
            <Form.Checkbox value="Sent" className="font-weight-light">
              {formatMessage(messages.sent)}
            </Form.Checkbox>
            <Form.Checkbox value="Self Enrollment" className="font-weight-light">
              {formatMessage(messages.selfEnrollment)}
            </Form.Checkbox>
          </Form.CheckboxSet>
        </Form.Group>
      </div>

      <div className="my-3">
        <Form.Group>
          <Form.Label className="h4 my-3">{formatMessage(messages.catalogStatus)}</Form.Label>
          <Form.CheckboxSet
            name="date-status"
            onChange={e => onChangeDateStatus(e.target.value, e.target.checked)}
            value={selectedDateStatuses}
          >
            <Form.Checkbox value="Open" className="font-weight-light">
              {formatMessage(messages.openStatus)}
            </Form.Checkbox>
            <Form.Checkbox value="Upcoming" className="font-weight-light">
              {formatMessage(messages.upcomingStatus)}
            </Form.Checkbox>
            <Form.Checkbox value="Ended" className="font-weight-light">
              {formatMessage(messages.endedStatus)}
            </Form.Checkbox>
          </Form.CheckboxSet>
        </Form.Group>
      </div>

      {organizations && Object.keys(organizations).length > 0 && (
      <div className="my-3">
        <Form.Group>
          <Form.Label className="h4 my-3">{formatMessage(messages.partnerLabel)}</Form.Label>
          <Form.CheckboxSet
            name="organization"
            onChange={e => onChangeOrg(e.target.value, e.target.checked)}
            value={selectedOrgs}
          >
            {Object.entries(organizations).map(([shortName, org]) => (
              <Form.Checkbox
                key={shortName}
                value={shortName}
                className="font-weight-light"
              >
                {org.name || shortName}
              </Form.Checkbox>
            ))}
          </Form.CheckboxSet>
        </Form.Group>
      </div>
      )}

      {/* Action Buttons (mobile) */}
      {isSmall && (
      <ButtonGroup className="pb-4 filter-actions">
        <Button variant="outline-secondary" onClick={onClearAll}>
          {formatMessage(messages.clearAll)}
        </Button>
        <Button variant="primary" onClick={onClose} className="pl-3">
          {formatMessage(messages.apply)}
        </Button>
      </ButtonGroup>
      )}
    </div>
  );
};

FilterPanel.propTypes = {
  selectedStatuses: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChangeStatus: PropTypes.func.isRequired,
  selectedDateStatuses: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChangeDateStatus: PropTypes.func.isRequired,
  selectedOrgs: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChangeOrg: PropTypes.func.isRequired,
  organizations: PropTypes.objectOf(
    PropTypes.shape({
      name: PropTypes.string,
      shortName: PropTypes.string,
    }),
  ),
  onClose: PropTypes.func.isRequired,
  isSmall: PropTypes.bool.isRequired,
  onClearAll: PropTypes.func.isRequired,
};

FilterPanel.defaultProps = {
  organizations: {},
};

export default FilterPanel;
