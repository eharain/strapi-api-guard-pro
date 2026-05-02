import React from 'react';
import { Box, Typography } from '@strapi/design-system';
import { StepContentType } from './StepContentType';
import { StepAction } from './StepAction';
import { StepFilters } from './StepFilters';
import { StepFields } from './StepFields';

const STEPS = ['content-type', 'action', 'filters', 'fields'];

export const ResourceWizard = ({ open, onClose, onSave }) => {
    const [currentStep, setCurrentStep] = React.useState(0);
    const [data, setData] = React.useState({
        contentType: null,
        action: null,
        filters: null,
        fields: null
    });

    const updateData = (step, value) => {
        const stepKey = STEPS[step];
        setData(prev => ({ ...prev, [stepKey]: { ...prev[stepKey], ...value } }));
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Build final resource
            const resource = {
                key: `${data.contentType?.uid}.${data.action?.action || 'custom'}`,
                displayName: `${data.contentType?.displayName} - ${data.action?.method || 'GET'} ${data.action?.path || ''}`,
                method: data.action?.method || 'GET',
                pathPattern: data.action?.path || '',
                contentTypeUid: data.contentType?.uid,
                type: data.action?.type === 'alias' ? 'alias' : 'standard',
                requestRules: {
                    dynamicFilters: data.filters?.filters || [],
                    filters: data.filters?.staticFilters?.reduce((acc, f) => ({ ...acc, [f.field]: f.value }), {}),
                    allowedFields: data.fields?.allowedFields,
                    allowedPopulate: data.fields?.populateRelations,
                    stripFields: data.fields?.hiddenFields
                },
                responseRules: {
                    allowedFields: data.fields?.allowedFields,
                    stripFields: data.fields?.hiddenFields
                },
                isActive: true
            };
            onSave(resource);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const renderStep = () => {
        switch (STEPS[currentStep]) {
            case 'content-type':
                return (
                    <StepContentType
                        value={data.contentType}
                        onChange={(val) => updateData(0, val)}
                        onNext={handleNext}
                    />
                );
            case 'action':
                return (
                    <StepAction
                        contentType={data.contentType}
                        value={data.action}
                        onChange={(val) => updateData(1, val)}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                );
            case 'filters':
                return (
                    <StepFilters
                        contentType={data.contentType}
                        action={data.action}
                        value={data.filters}
                        onChange={(val) => updateData(2, val)}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                );
            case 'fields':
                return (
                    <StepFields
                        contentType={data.contentType}
                        value={data.fields}
                        onChange={(val) => updateData(3, val)}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                );
            default:
                return null;
        }
    };

    const stepNames = ['Select Content Type', 'Choose Action', 'Set Filters', 'Configure Fields'];

    if (!open) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <Box
                background="neutral0"
                padding={6}
                style={{
                    width: 800, maxWidth: '95vw',
                    maxHeight: '90vh', overflowY: 'auto',
                    borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <Typography variant="beta" id="wizard-title">
                            Create API Resource
                        </Typography>
                        <Typography variant="pi" textColor="neutral500" paddingTop={1}>
                            Step {currentStep + 1} of {STEPS.length}: {stepNames[currentStep]}
                        </Typography>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                {renderStep()}
            </Box>
        </div>
    );
};