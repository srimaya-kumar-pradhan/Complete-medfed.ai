"""
FL-FedFib Model
================
DenseNet121-based multi-label chest X-ray classifier.
Uses ImageNet pretrained weights with a custom classification head.
"""
import torch
import torch.nn as nn
import torchvision.models as models


def create_model(num_classes, model_name="densenet121", pretrained=True):
    """
    Create a medical image classification model.
    
    Args:
        num_classes: Number of output classes (multi-label).
        model_name: "densenet121" or "resnet18".
        pretrained: Whether to use ImageNet pretrained weights.
    
    Returns:
        nn.Module: The classification model.
    """
    if model_name == "densenet121":
        weights = models.DenseNet121_Weights.DEFAULT if pretrained else None
        model = models.densenet121(weights=weights)
        # Replace classifier head
        in_features = model.classifier.in_features
        model.classifier = nn.Linear(in_features, num_classes)
        
    elif model_name == "resnet18":
        weights = models.ResNet18_Weights.DEFAULT if pretrained else None
        model = models.resnet18(weights=weights)
        in_features = model.fc.in_features
        model.fc = nn.Linear(in_features, num_classes)
        
    else:
        raise ValueError(f"Unknown model: {model_name}")
    
    return model


def get_model_param_count(model):
    """Return total and trainable parameter counts."""
    total = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return total, trainable


def get_model_state_size(model):
    """Estimate model state dict size in bytes."""
    state_dict = model.state_dict()
    size = 0
    for key, tensor in state_dict.items():
        size += tensor.nelement() * tensor.element_size()
    return size


def freeze_backbone(model, model_name="densenet121"):
    """
    Freeze all layers except the classification head.
    Useful for initial fine-tuning with limited data.
    """
    if model_name == "densenet121":
        for name, param in model.named_parameters():
            if "classifier" not in name:
                param.requires_grad = False
    elif model_name == "resnet18":
        for name, param in model.named_parameters():
            if "fc" not in name:
                param.requires_grad = False


def unfreeze_all(model):
    """Unfreeze all model parameters."""
    for param in model.parameters():
        param.requires_grad = True
