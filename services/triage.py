"""
Simple triage heuristics for UTIs (hackathon MVP).
Return a dict with condition, severity and urgent flag.
"""

def assess_uti_symptoms(symptoms):
    if not symptoms:
        return {"condition": None, "severity": None, "urgent": False}

    urgent = False
    severity = 'mild'

    if any(s in symptoms for s in ['blood', 'fever']):
        urgency = True
    if any(s in symptoms for s in ['blood', 'fever']):
        severity = 'severe'
        urgent = True
    elif len(symptoms) >= 2:
        severity = 'moderate'
    else:
        severity = 'mild'

    condition = None
    if any(s in symptoms for s in ['burn', 'burning', 'frequent', 'urgency']):
        condition = 'Possible UTI'

    return {"condition": condition, "severity": severity, "urgent": urgent}


def determine_urgency(symptoms):
    return assess_uti_symptoms(symptoms)['urgent']
