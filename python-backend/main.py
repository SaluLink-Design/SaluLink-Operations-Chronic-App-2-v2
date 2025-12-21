"""
SaluLink Chronic App - Python Backend API
Handles ClinicalBERT analysis using the Authi 1.0 logic
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import torch
from transformers import AutoTokenizer, AutoModel
import pandas as pd
import numpy as np
from pathlib import Path

app = FastAPI(title="SaluLink Authi API")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and data
tokenizer = None
model = None
chronic_condition_embeddings = []


class AnalysisRequest(BaseModel):
    clinical_note: str


class MatchedConditionResponse(BaseModel):
    condition: str
    icd_code: str
    icd_description: str
    similarity_score: float


class AnalysisResponse(BaseModel):
    extracted_keywords: List[str]
    matched_conditions: List[MatchedConditionResponse]


def load_model():
    """Initialize ClinicalBERT model and tokenizer"""
    global tokenizer, model
    
    print("Loading ClinicalBERT model...")
    tokenizer = AutoTokenizer.from_pretrained("emilyalsentzer/Bio_ClinicalBERT")
    model = AutoModel.from_pretrained("emilyalsentzer/Bio_ClinicalBERT")
    model.eval()
    print("Model loaded successfully!")


def load_chronic_conditions():
    """Load and process chronic conditions with embeddings"""
    global chronic_condition_embeddings
    
    print("Loading chronic conditions...")
    # Use local CSV file (copied for Railway deployment)
    csv_path = Path(__file__).parent / "Chronic Conditions.csv"
    
    if not csv_path.exists():
        # Fallback to parent directory for local development
        csv_path = Path(__file__).parent.parent / "Chronic Conditions.csv"
    
    print(f"Loading CSV from: {csv_path}")
    df = pd.read_csv(csv_path)
    
    chronic_condition_embeddings = []
    
    for _, row in df.iterrows():
        description = row['ICD-Code Description']
        condition = row['CHRONIC CONDITIONS']
        icd_code = row['ICD-Code']
        
        # Extract keywords and embeddings
        _, embeddings = extract_keywords_clinicalbert(description)
        
        if embeddings.nelement() > 0:
            averaged_embedding = torch.mean(embeddings, dim=0)
        else:
            averaged_embedding = None
        
        chronic_condition_embeddings.append({
            'condition': condition,
            'icd_code': icd_code,
            'icd_description': description,
            'embedding': averaged_embedding
        })
    
    print(f"Loaded {len(chronic_condition_embeddings)} chronic condition entries")


def extract_keywords_clinicalbert(text: str):
    """
    Processes clinical text and extracts keywords with embeddings
    """
    # Tokenize the input text
    inputs = tokenizer(text, return_tensors='pt', truncation=True, padding=True, max_length=512)

    # Get model outputs
    with torch.no_grad():
        outputs = model(**inputs)

    # Extract embeddings
    last_hidden_state = outputs.last_hidden_state

    # Get tokens
    input_ids = inputs['input_ids'].squeeze().tolist()
    tokens = tokenizer.convert_ids_to_tokens(input_ids)

    # Medical stopwords to skip
    stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'been', 'be',
                 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'}

    extracted_keywords = []
    keyword_embeddings = []
    current_word = ""
    current_embedding_indices = []

    # Process tokens
    for i, token in enumerate(tokens):
        # Skip special tokens
        if token in tokenizer.all_special_tokens:
            if current_word and len(current_word) > 2 and current_word.lower() not in stopwords:
                avg_embedding = torch.mean(last_hidden_state[0, current_embedding_indices, :], dim=0)
                extracted_keywords.append(current_word)
                keyword_embeddings.append(avg_embedding)
            current_word = ""
            current_embedding_indices = []
            continue

        # Reassemble subword tokens
        if token.startswith('##'):
            current_word += token[2:]
            current_embedding_indices.append(i)
        else:
            if current_word and len(current_word) > 2 and current_word.lower() not in stopwords:
                avg_embedding = torch.mean(last_hidden_state[0, current_embedding_indices, :], dim=0)
                extracted_keywords.append(current_word)
                keyword_embeddings.append(avg_embedding)
            current_word = token
            current_embedding_indices = [i]

    # Add last word
    if current_word and len(current_word) > 2 and current_word.lower() not in stopwords:
        avg_embedding = torch.mean(last_hidden_state[0, current_embedding_indices, :], dim=0)
        extracted_keywords.append(current_word)
        keyword_embeddings.append(avg_embedding)

    embeddings_tensor = torch.stack(keyword_embeddings) if keyword_embeddings else torch.tensor([])
    return extracted_keywords, embeddings_tensor


def get_sentence_embedding(text: str):
    """
    Get embedding for entire clinical note using CLS token
    """
    inputs = tokenizer(text, return_tensors='pt', truncation=True, padding=True, max_length=512)

    with torch.no_grad():
        outputs = model(**inputs)

    # Use CLS token embedding (first token) for sentence representation
    cls_embedding = outputs.last_hidden_state[:, 0, :]
    return cls_embedding.squeeze()


def calculate_cosine_similarity(embedding1, embedding2):
    """Calculate cosine similarity between two embeddings"""
    embedding1 = embedding1.squeeze()
    embedding2 = embedding2.squeeze()

    if embedding1.dim() == 1:
        embedding1 = embedding1.unsqueeze(0)
    if embedding2.dim() == 1:
        embedding2 = embedding2.unsqueeze(0)

    return torch.nn.functional.cosine_similarity(embedding1, embedding2)


def match_conditions(clinical_note: str, clinical_keywords, clinical_keyword_embeddings, min_results=3, max_results=5):
    """
    Match clinical note to chronic conditions using multiple strategies
    Returns 3-5 best matching conditions
    """
    # Get sentence-level embedding for the full clinical note
    sentence_embedding = get_sentence_embedding(clinical_note)

    # Strategy 1: Keyword-level matching
    keyword_scores = {}
    for i, keyword_embedding in enumerate(clinical_keyword_embeddings):
        for condition_data in chronic_condition_embeddings:
            condition_embedding = condition_data['embedding']
            if condition_embedding is None:
                continue

            similarity = calculate_cosine_similarity(keyword_embedding, condition_embedding).item()

            condition_name = condition_data['condition']
            if condition_name not in keyword_scores:
                keyword_scores[condition_name] = {
                    'max_similarity': similarity,
                    'avg_similarity': similarity,
                    'count': 1,
                    'condition_data': condition_data
                }
            else:
                keyword_scores[condition_name]['max_similarity'] = max(
                    keyword_scores[condition_name]['max_similarity'], similarity
                )
                keyword_scores[condition_name]['avg_similarity'] = (
                    (keyword_scores[condition_name]['avg_similarity'] * keyword_scores[condition_name]['count'] + similarity) /
                    (keyword_scores[condition_name]['count'] + 1)
                )
                keyword_scores[condition_name]['count'] += 1

    # Strategy 2: Sentence-level matching
    sentence_scores = {}
    for condition_data in chronic_condition_embeddings:
        condition_embedding = condition_data['embedding']
        if condition_embedding is None:
            continue

        similarity = calculate_cosine_similarity(sentence_embedding, condition_embedding).item()
        sentence_scores[condition_data['condition']] = similarity

    # Combine scores with weights
    combined_scores = {}
    all_conditions = set(keyword_scores.keys()) | set(sentence_scores.keys())

    for condition_name in all_conditions:
        keyword_score_data = keyword_scores.get(condition_name, None)
        sentence_score = sentence_scores.get(condition_name, 0.0)

        if keyword_score_data:
            # Weighted combination: 60% keyword max, 20% keyword avg, 20% sentence
            combined_score = (
                0.6 * keyword_score_data['max_similarity'] +
                0.2 * keyword_score_data['avg_similarity'] +
                0.2 * sentence_score
            )
            condition_data = keyword_score_data['condition_data']
        else:
            # Only sentence score available
            combined_score = sentence_score
            condition_data = next(c for c in chronic_condition_embeddings if c['condition'] == condition_name)

        combined_scores[condition_name] = {
            'condition': condition_data['condition'],
            'icd_code': condition_data['icd_code'],
            'icd_description': condition_data['icd_description'],
            'similarity_score': combined_score
        }

    # Sort by score
    result_list = sorted(combined_scores.values(), key=lambda x: x['similarity_score'], reverse=True)

    # Dynamic threshold adjustment to ensure min_results
    if len(result_list) < min_results:
        # Return all available results if less than minimum
        return result_list
    elif len(result_list) >= min_results:
        # Check if we have at least min_results with reasonable scores
        # Start with a threshold and reduce if needed
        threshold = 0.65
        filtered_results = [r for r in result_list if r['similarity_score'] >= threshold]

        # If we don't have enough, gradually lower threshold
        while len(filtered_results) < min_results and threshold > 0.3:
            threshold -= 0.05
            filtered_results = [r for r in result_list if r['similarity_score'] >= threshold]

        # Ensure we return between min_results and max_results
        if len(filtered_results) < min_results:
            return result_list[:min_results]
        else:
            return filtered_results[:max_results]

    return result_list[:max_results]


@app.on_event("startup")
async def startup_event():
    """Initialize model and data on startup"""
    load_model()
    load_chronic_conditions()


@app.get("/")
async def root():
    return {"message": "SaluLink Authi API is running"}


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "conditions_loaded": len(chronic_condition_embeddings) > 0
    }


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_clinical_note(request: AnalysisRequest):
    """
    Analyze a clinical note and return matched conditions
    Enhanced with Authi 1.0 multi-strategy matching
    """
    try:
        if not model or not tokenizer:
            raise HTTPException(status_code=500, detail="Model not loaded")

        # Extract keywords
        keywords, embeddings = extract_keywords_clinicalbert(request.clinical_note)

        if embeddings.nelement() == 0:
            return AnalysisResponse(
                extracted_keywords=[],
                matched_conditions=[]
            )

        # Match conditions using improved Authi 1.0 algorithm
        matches = match_conditions(
            clinical_note=request.clinical_note,
            clinical_keywords=keywords,
            clinical_keyword_embeddings=embeddings,
            min_results=3,
            max_results=5
        )

        # Filter keywords to show most relevant medical terms
        relevant_keywords = [kw for kw in keywords if len(kw) > 3][:20]

        return AnalysisResponse(
            extracted_keywords=relevant_keywords,
            matched_conditions=[
                MatchedConditionResponse(
                    condition=m['condition'],
                    icd_code=m['icd_code'],
                    icd_description=m['icd_description'],
                    similarity_score=round(m['similarity_score'], 4)
                )
                for m in matches
            ]
        )

    except Exception as e:
        print(f"Error in analyze_clinical_note: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

