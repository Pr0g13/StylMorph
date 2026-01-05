from setuptools import setup, find_packages

setup(
    name="stylmorph-pipeline",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "numpy>=1.21.0",
        "opencv-python>=4.5.0",
        "Pillow>=9.0.0",
        "pyyaml>=6.0",
        "scipy>=1.7.0",
        "scikit-image>=0.19.0",
    ],
    extras_require={
        "ai": [
            "mediapipe>=0.8.10",
            "rembg>=2.0.30",
            "torch>=1.10.0",
            "torchvision>=0.11.0",
        ],
        "dev": [
            "pytest>=7.0.0",
            "black>=22.0.0",
            "flake8>=4.0.0",
        ]
    },
    python_requires=">=3.8",
)