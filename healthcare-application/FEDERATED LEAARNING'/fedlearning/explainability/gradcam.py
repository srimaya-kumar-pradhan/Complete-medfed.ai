"""
FL-FedFib Grad-CAM
====================
Gradient-weighted Class Activation Mapping for model explainability.
Shows which image regions influenced the model's prediction.

OUTPUT IS MODEL EXPLANATION, NOT CLINICAL DIAGNOSIS.
"""
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
import matplotlib.cm as cm


class GradCAM:
    """
    Grad-CAM implementation for DenseNet121 and ResNet18.
    
    Captures gradients at a target convolutional layer and produces
    a class-specific heatmap overlay.
    """
    
    def __init__(self, model, target_layer_name="features.denseblock4"):
        self.model = model
        self.model.eval()
        self.target_layer_name = target_layer_name
        
        self.gradients = None
        self.activations = None
        self._hook_handles = []
        
        # Register hooks
        self._register_hooks()
    
    def _register_hooks(self):
        """Register forward and backward hooks on the target layer."""
        target_layer = None
        for name, module in self.model.named_modules():
            if name == self.target_layer_name:
                target_layer = module
                break
        
        if target_layer is None:
            # Try common fallback layer names
            fallbacks = [
                "features.denseblock4",
                "features",
                "layer4",  # ResNet
            ]
            for fb in fallbacks:
                for name, module in self.model.named_modules():
                    if name == fb:
                        target_layer = module
                        self.target_layer_name = fb
                        break
                if target_layer:
                    break
        
        if target_layer is None:
            raise ValueError(
                f"Target layer '{self.target_layer_name}' not found. "
                f"Available layers: {[n for n, _ in self.model.named_modules()][:20]}"
            )
        
        def forward_hook(module, input, output):
            self.activations = output.detach()
        
        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()
        
        h1 = target_layer.register_forward_hook(forward_hook)
        h2 = target_layer.register_full_backward_hook(backward_hook)
        self._hook_handles = [h1, h2]
    
    def generate(self, input_tensor, class_idx=None):
        """
        Generate Grad-CAM heatmap.
        
        Args:
            input_tensor: Preprocessed image tensor (1, C, H, W).
            class_idx: Target class index. If None, uses the predicted class.
        
        Returns:
            heatmap: numpy array (H, W) with values in [0, 1].
            predictions: numpy array of class probabilities.
        """
        self.model.eval()
        
        # Ensure gradients are enabled for this forward pass
        input_tensor = input_tensor.requires_grad_(True)
        
        # Forward pass
        output = self.model(input_tensor)
        predictions = torch.sigmoid(output).detach().cpu().numpy().flatten()
        
        if class_idx is None:
            class_idx = predictions.argmax()
        
        # Backward pass for target class
        self.model.zero_grad()
        target = output[0, class_idx]
        target.backward()
        
        if self.gradients is None or self.activations is None:
            # Fallback: return uniform heatmap
            h, w = input_tensor.shape[2], input_tensor.shape[3]
            return np.ones((h, w)) * 0.5, predictions
        
        # Global average pooling of gradients
        weights = self.gradients.mean(dim=[2, 3], keepdim=True)  # (1, C, 1, 1)
        
        # Weighted sum of activations
        cam = (weights * self.activations).sum(dim=1, keepdim=True)  # (1, 1, H, W)
        cam = F.relu(cam)  # Only positive contributions
        
        # Resize to input size
        cam = F.interpolate(
            cam, size=input_tensor.shape[2:], mode='bilinear', align_corners=False
        )
        
        # Normalize to [0, 1]
        cam = cam.squeeze().cpu().numpy()
        if cam.max() > cam.min():
            cam = (cam - cam.min()) / (cam.max() - cam.min())
        else:
            cam = np.zeros_like(cam)
        
        return cam, predictions
    
    def cleanup(self):
        """Remove hooks."""
        for h in self._hook_handles:
            h.remove()
        self._hook_handles = []


def create_gradcam_overlay(original_image, heatmap, alpha=0.4):
    """
    Create a Grad-CAM overlay visualization.
    
    Args:
        original_image: PIL Image or numpy array.
        heatmap: numpy array (H, W) with values in [0, 1].
        alpha: Overlay transparency.
    
    Returns:
        PIL Image with heatmap overlay.
    """
    if isinstance(original_image, Image.Image):
        original = np.array(original_image.convert("RGB"))
    else:
        original = original_image
    
    h, w = original.shape[:2]
    
    # Resize heatmap to original image size
    heatmap_resized = np.array(
        Image.fromarray((heatmap * 255).astype(np.uint8)).resize((w, h))
    ) / 255.0
    
    # Apply colormap
    try:
        colormap = plt.get_cmap("jet")
    except Exception:
        colormap = cm.jet
    heatmap_colored = colormap(heatmap_resized)[:, :, :3]  # RGB, no alpha
    heatmap_colored = (heatmap_colored * 255).astype(np.uint8)
    
    # Blend
    overlay = (
        (1 - alpha) * original.astype(np.float32) +
        alpha * heatmap_colored.astype(np.float32)
    ).clip(0, 255).astype(np.uint8)
    
    return Image.fromarray(overlay)


def create_gradcam_figure(original_image, heatmap, predictions,
                          label_names, class_idx=None):
    """
    Create a matplotlib figure with original, heatmap, and overlay.
    
    Returns:
        matplotlib Figure.
    """
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    
    # Original
    if isinstance(original_image, Image.Image):
        axes[0].imshow(original_image.convert("RGB"))
    else:
        axes[0].imshow(original_image)
    axes[0].set_title("Original X-ray")
    axes[0].axis("off")
    
    # Heatmap
    axes[1].imshow(heatmap, cmap="jet")
    axes[1].set_title("Grad-CAM Heatmap")
    axes[1].axis("off")
    
    # Overlay
    overlay = create_gradcam_overlay(original_image, heatmap)
    axes[2].imshow(overlay)
    target_name = label_names[class_idx] if class_idx is not None else "Top prediction"
    axes[2].set_title(f"Overlay ({target_name})")
    axes[2].axis("off")
    
    # Add predictions text
    pred_text = "Predictions:\n"
    for i, (name, prob) in enumerate(zip(label_names, predictions)):
        marker = " <--" if i == class_idx else ""
        pred_text += f"  {name}: {prob:.3f}{marker}\n"
    
    fig.text(0.02, 0.02, pred_text, fontsize=8, fontfamily="monospace",
             verticalalignment="bottom",
             bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.8))
    
    fig.suptitle(
        "Model Explanation (Research Prototype - NOT Clinical Diagnosis)",
        fontsize=10, color="red"
    )
    
    plt.tight_layout()
    return fig
